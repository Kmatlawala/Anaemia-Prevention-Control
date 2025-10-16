// routes/sync.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const smsService = require('../services/smsService');

// Handle offline queue sync
router.post('/', async (req, res) => {
  try {
    const { op, entity, payload, timestamp } = req.body;
    
    console.log('[Sync] Received sync request:', { op, entity, timestamp });
    
    switch (op) {
      case 'CREATE':
        if (entity === 'beneficiaries') {
          const result = await pool.query(
            'INSERT INTO beneficiaries (name, age, gender, phone, address, id_number, aadhaar_hash, dob, category, alt_phone, doctor_name, doctor_phone, registration_date, location, front_document, back_document, follow_up_due, hb, calcium_qty, short_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              payload.name,
              payload.age,
              payload.gender,
              payload.phone,
              payload.address,
              payload.id_number,
              payload.aadhaar_hash,
              payload.dob,
              payload.category,
              payload.alt_phone,
              payload.doctor_name,
              payload.doctor_phone,
              payload.registration_date,
              payload.location,
              payload.front_document,
              payload.back_document,
              payload.follow_up_due,
              payload.hb,
              payload.calcium_qty,
              payload.short_id
            ]
          );
          console.log('[Sync] Created beneficiary:', result[0].insertId);
          
          // Send notification and SMS after successful sync
          try {
            await sendSyncNotifications(req, 'registration', {
              id: result[0].insertId,
              name: payload.name,
              phone: payload.phone,
              short_id: payload.short_id,
              doctor_name: payload.doctor_name,
              doctor_phone: payload.doctor_phone
            });
          } catch (notifyError) {
            console.warn('[Sync] Notification failed for beneficiary:', notifyError?.message || notifyError);
          }
        } else if (entity === 'interventions') {
          const result = await pool.query(
            'INSERT INTO interventions (beneficiary_id, doctor_name, ifa_yes, ifa_quantity, calcium_yes, calcium_quantity, deworm_yes, deworming_date, therapeutic_yes, therapeutic_notes, referral_yes, referral_facility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              payload.beneficiaryId,
              payload.doctor_name,
              payload.ifa_yes,
              payload.ifa_quantity,
              payload.calcium_yes,
              payload.calcium_quantity,
              payload.deworm_yes,
              payload.deworming_date,
              payload.therapeutic_yes,
              payload.therapeutic_notes,
              payload.referral_yes,
              payload.referral_facility
            ]
          );
          console.log('[Sync] Created intervention:', result[0].insertId);
          
          // Send notification and SMS after successful sync
          try {
            // Get beneficiary details for notification
            const [beneficiaryRows] = await pool.query('SELECT name, phone, short_id FROM beneficiaries WHERE id = ?', [payload.beneficiaryId]);
            if (beneficiaryRows.length > 0) {
              const beneficiary = beneficiaryRows[0];
              await sendSyncNotifications(req, 'intervention', {
                id: result[0].insertId,
                beneficiaryId: payload.beneficiaryId,
                name: beneficiary.name,
                phone: beneficiary.phone,
                short_id: beneficiary.short_id,
                doctor_name: payload.doctor_name
              });
            }
          } catch (notifyError) {
            console.warn('[Sync] Notification failed for intervention:', notifyError?.message || notifyError);
          }
        } else if (entity === 'screenings') {
          const result = await pool.query(
            'INSERT INTO screenings (beneficiary_id, doctor_name, hemoglobin, anemia_category, pallor, visit_type, severity, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              payload.beneficiaryId,
              payload.doctor_name,
              payload.hemoglobin,
              payload.anemia_category,
              payload.pallor,
              payload.visit_type,
              payload.severity,
              payload.notes
            ]
          );
          console.log('[Sync] Created screening:', result[0].insertId);
          
          // Send notification and SMS after successful sync
          try {
            // Get beneficiary details for notification
            const [beneficiaryRows] = await pool.query('SELECT name, phone, short_id FROM beneficiaries WHERE id = ?', [payload.beneficiaryId]);
            if (beneficiaryRows.length > 0) {
              const beneficiary = beneficiaryRows[0];
              await sendSyncNotifications(req, 'screening', {
                id: result[0].insertId,
                beneficiaryId: payload.beneficiaryId,
                name: beneficiary.name,
                phone: beneficiary.phone,
                short_id: beneficiary.short_id,
                doctor_name: payload.doctor_name,
                hemoglobin: payload.hemoglobin,
                severity: payload.severity
              });
            }
          } catch (notifyError) {
            console.warn('[Sync] Notification failed for screening:', notifyError?.message || notifyError);
          }
        }
        break;
        
      case 'UPDATE':
        if (entity === 'beneficiaries') {
          const { id, updates } = payload;
          const updateFields = [];
          const updateValues = [];
          
          Object.keys(updates).forEach(key => {
            if (key !== 'id' && key !== '_pending') {
              updateFields.push(`${key} = ?`);
              updateValues.push(updates[key]);
            }
          });
          
          if (updateFields.length > 0) {
            updateValues.push(id);
            const result = await pool.query(
              `UPDATE beneficiaries SET ${updateFields.join(', ')} WHERE id = ?`,
              updateValues
            );
            console.log('[Sync] Updated beneficiary:', id, 'rows affected:', result[0].affectedRows);
            
            // Send notification and SMS after successful sync
            try {
              // Get beneficiary details for notification
              const [beneficiaryRows] = await pool.query('SELECT name, phone, short_id, doctor_name, doctor_phone FROM beneficiaries WHERE id = ?', [id]);
              if (beneficiaryRows.length > 0) {
                const beneficiary = beneficiaryRows[0];
                await sendSyncNotifications(req, 'update', {
                  id: id,
                  name: beneficiary.name,
                  phone: beneficiary.phone,
                  short_id: beneficiary.short_id,
                  doctor_name: beneficiary.doctor_name,
                  doctor_phone: beneficiary.doctor_phone
                });
              }
            } catch (notifyError) {
              console.warn('[Sync] Notification failed for beneficiary update:', notifyError?.message || notifyError);
            }
          }
        }
        break;
        
      default:
        console.warn('[Sync] Unknown operation:', op);
    }
    
    res.json({ success: true, message: 'Sync completed successfully' });
  } catch (error) {
    console.error('[Sync] Error processing sync request:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Helper function to send notifications and SMS after successful sync
async function sendSyncNotifications(req, type, data) {
  try {
    const app = req.app;
    
    // Prepare notification data
    let title, body, notificationData;
    
    switch (type) {
      case 'registration':
        title = 'Registration Synced';
        body = `Beneficiary ${data.name || ''} registration synced successfully.`;
        notificationData = {
          type: 'registration_synced',
          id: String(data.id),
          beneficiary: {
            id: data.id,
            name: data.name,
            phone: data.phone,
            short_id: data.short_id,
            doctor_name: data.doctor_name,
            doctor_phone: data.doctor_phone
          }
        };
        break;
        
      case 'update':
        title = 'Beneficiary Updated';
        body = `Beneficiary ${data.name || ''} updated successfully.`;
        notificationData = {
          type: 'beneficiary_updated_synced',
          id: String(data.id),
          beneficiary: {
            id: data.id,
            name: data.name,
            phone: data.phone,
            short_id: data.short_id,
            doctor_name: data.doctor_name,
            doctor_phone: data.doctor_phone
          }
        };
        break;
        
      case 'intervention':
        title = 'Intervention Synced';
        body = `Intervention for ${data.name || ''} synced successfully.`;
        notificationData = {
          type: 'intervention_synced',
          id: String(data.id),
          beneficiaryId: data.beneficiaryId,
          beneficiary: {
            name: data.name,
            phone: data.phone,
            short_id: data.short_id
          }
        };
        break;
        
      case 'screening':
        title = 'Screening Synced';
        body = `Screening for ${data.name || ''} synced successfully.`;
        notificationData = {
          type: 'screening_synced',
          id: String(data.id),
          beneficiaryId: data.beneficiaryId,
          beneficiary: {
            name: data.name,
            phone: data.phone,
            short_id: data.short_id
          },
          screening: {
            hemoglobin: data.hemoglobin,
            severity: data.severity
          }
        };
        break;
        
      default:
        title = 'Data Synced';
        body = 'Offline data synced successfully.';
        notificationData = { type: 'data_synced' };
    }
    
    // Send push notification
    if (app?.locals?.firebaseAdmin) {
      const [tokens] = await pool.query('SELECT token FROM notification_tokens');
      const tokenList = tokens.map(r => r.token);
      if (tokenList.length > 0) {
        await app.locals.firebaseAdmin.messaging().sendEachForMulticast({
          tokens: tokenList,
          notification: { title, body },
          data: notificationData,
          android: { priority: 'high' },
          apns: { headers: { 'apns-priority': '10' } }
        });
        console.log('[Sync] Push notification sent:', title);
      }
    }
    
    // Log notification
    try {
      await pool.query(
        'INSERT INTO notifications_log (title, body, data) VALUES (?, ?, ?)',
        [title, body, JSON.stringify(notificationData)]
      );
    } catch (logError) {
      console.warn('[Sync] Failed to log notification:', logError?.message || logError);
    }
    
    // Send SMS to beneficiary if phone number is available
    if (data.phone && data.name) {
      try {
        let smsType = 'registration';
        let smsData = { short_id: data.short_id, doctor_name: data.doctor_name, doctor_phone: data.doctor_phone };
        
        if (type === 'update') {
          smsType = 'update';
          smsData = { short_id: data.short_id };
        } else if (type === 'intervention') {
          smsType = 'intervention';
          smsData = { short_id: data.short_id };
        } else if (type === 'screening') {
          smsType = 'screening';
          smsData = { short_id: data.short_id, hemoglobin: data.hemoglobin, severity: data.severity };
        }
        
        await smsService.sendBeneficiarySMS(data.phone, data.name, smsType, smsData);
        console.log('[Sync] SMS sent to beneficiary:', data.phone, 'Type:', smsType);
      } catch (smsError) {
        console.warn('[Sync] SMS failed:', smsError?.message || smsError);
      }
    }
    
  } catch (error) {
    console.error('[Sync] sendSyncNotifications error:', error?.message || error);
    throw error;
  }
}

module.exports = router;
