const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Trigger when beneficiary doc is created/updated
exports.notifyBeneficiaryChange = functions.firestore
  .document('beneficiaries/{beneficiaryId}')
  .onWrite(async (change, context) => {
    const beneficiaryId = context.params.beneficiaryId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // determine action
    let action = 'updated';
    if (!before && after) action = 'added';
    if (before && !after) action = 'deleted';

    // who to notify? example: ownerId, phone owner or doctor
    const ownerId = (after && after.ownerId) || (before && before.ownerId);
    if (!ownerId) return null;

    // message content
    const title = `Beneficiary ${action}`;
    const body = `${after?.name || before?.name || 'Record'} (${after?.short_id || ''}) was ${action}.`;

    // fetch device tokens for owner
    const tokensSnap = await admin.firestore().collection('users').doc(ownerId).collection('tokens').get();
    const tokens = tokensSnap.docs.map(d => d.id).filter(Boolean);

    // Build payload
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

    // Save notification doc to user's notifications subcollection
    const notifRef = admin.firestore().collection('notifications').doc(ownerId).collection('inbox').doc();
    const notifDoc = {
      title, body, data: { beneficiaryId, action }, read: false, createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await notifRef.set(notifDoc).catch(e => console.warn('notif set err', e));

    if (tokens.length === 0) return null;

    // send to devices
    const res = await admin.messaging().sendToDevice(tokens, payload);
    // cleanup invalid tokens
    const tokensToRemove = [];
    res.results.forEach((r, i) => {
      if (r.error) {
        const err = r.error;
        // common: registration-token-not-registered, invalid-registration-token
        if (err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token') {
          tokensToRemove.push(tokens[i]);
        }
      }
    });
    // delete invalid tokens
    const deletes = tokensToRemove.map(t => admin.firestore().collection('users').doc(ownerId).collection('tokens').doc(t).delete());
    await Promise.all(deletes);

    return null;
  });
