const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.notifyBeneficiaryChange = functions.firestore
  .document('beneficiaries/{beneficiaryId}')
  .onWrite(async (change, context) => {
    const beneficiaryId = context.params.beneficiaryId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let action = 'updated';
    if (!before && after) action = 'added';
    if (before && !after) action = 'deleted';

    const ownerId = (after && after.ownerId) || (before && before.ownerId);
    if (!ownerId) return null;

    const title = `Beneficiary ${action}`;
    const body = `${after?.name || before?.name || 'Record'} (${after?.short_id || ''}) was ${action}.`;

    const tokensSnap = await admin.firestore().collection('users').doc(ownerId).collection('tokens').get();
    const tokens = tokensSnap.docs.map(d => d.id).filter(Boolean);

    const payload = {
      notification: { title, body },
      data: {
        type: 'beneficiary_update',
        beneficiaryId,
        action,
      },
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' }, payload: { aps: { 'content-available': 1 } } },
    };

    const notifRef = admin.firestore().collection('notifications').doc(ownerId).collection('inbox').doc();
    const notifDoc = {
      title, body, data: { beneficiaryId, action }, read: false, createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await notifRef.set(notifDoc).catch(e => );

    if (tokens.length === 0) return null;

    const res = await admin.messaging().sendToDevice(tokens, payload);
    
    const tokensToRemove = [];
    res.results.forEach((r, i) => {
      if (r.error) {
        const err = r.error;
        
        if (err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token') {
          tokensToRemove.push(tokens[i]);
        }
      }
    });
    
    const deletes = tokensToRemove.map(t => admin.firestore().collection('users').doc(ownerId).collection('tokens').doc(t).delete());
    await Promise.all(deletes);

    return null;
  });
