// src/routes/dot.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const {authenticateToken} = require('../middleware/auth');
// SMS is handled by native frontend

// Get today's adherence status for a beneficiary
router.get('/today-adherence/:beneficiaryId', async (req, res) => {
  try {
    const {beneficiaryId} = req.params;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log('[DOT] Checking today adherence for beneficiary:', beneficiaryId, 'Date:', today);

    // Check if IFA was taken today
    const [adherenceRecords] = await pool.query(
      `SELECT * FROM dot_adherence 
       WHERE beneficiary_id = ? AND DATE(taken_date) = ?`,
      [beneficiaryId, today]
    );

    const takenToday = adherenceRecords.length > 0;

    res.json({
      success: true,
      takenToday,
      date: today,
      records: adherenceRecords
    });
  } catch (error) {
    console.error('[DOT] Today adherence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check today adherence'
    });
  }
});

// Get adherence data for a beneficiary (last 30 days)
router.get('/adherence-data/:beneficiaryId', async (req, res) => {
  try {
    const {beneficiaryId} = req.params;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    console.log('[DOT] Getting adherence data for beneficiary:', beneficiaryId, 'Since:', startDate);

    // Get adherence records for last 30 days
    const [adherenceRecords] = await pool.query(
      `SELECT * FROM dot_adherence 
       WHERE beneficiary_id = ? AND DATE(taken_date) >= ?
       ORDER BY taken_date DESC`,
      [beneficiaryId, startDate]
    );

    // Calculate statistics
    const totalDays = 30;
    const takenDays = adherenceRecords.length;
    const missedDays = totalDays - takenDays;
    const adherencePercentage = totalDays > 0 ? Math.round((takenDays / totalDays) * 100) : 0;

    // Get consecutive missed days
    const today = new Date().toISOString().split('T')[0];
    const [recentRecords] = await pool.query(
      `SELECT taken_date FROM dot_adherence 
       WHERE beneficiary_id = ? AND DATE(taken_date) >= ?
       ORDER BY taken_date DESC
       LIMIT 1`,
      [beneficiaryId, startDate]
    );

    let consecutiveMissedDays = 0;
    if (recentRecords.length > 0) {
      const lastTakenDate = new Date(recentRecords[0].taken_date);
      const todayDate = new Date(today);
      consecutiveMissedDays = Math.floor((todayDate - lastTakenDate) / (1000 * 60 * 60 * 24));
    } else {
      consecutiveMissedDays = totalDays; // No records in last 30 days
    }

    res.json({
      success: true,
      data: {
        totalDays,
        takenDays,
        missedDays,
        adherencePercentage,
        consecutiveMissedDays,
        records: adherenceRecords
      }
    });
  } catch (error) {
    console.error('[DOT] Adherence data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get adherence data'
    });
  }
});

// Mark IFA as taken today
router.post('/mark-ifa-taken', async (req, res) => {
  try {
    const {beneficiaryId} = req.body;
    const today = new Date().toISOString().split('T')[0];

    console.log('[DOT] Marking IFA taken for beneficiary:', beneficiaryId, 'Date:', today);

    // Check if already marked today
    const [existingRecords] = await pool.query(
      `SELECT * FROM dot_adherence 
       WHERE beneficiary_id = ? AND DATE(taken_date) = ?`,
      [beneficiaryId, today]
    );

    if (existingRecords.length > 0) {
      return res.json({
        success: true,
        message: 'IFA already marked as taken today',
        alreadyTaken: true
      });
    }

    // Insert new adherence record
    const [result] = await pool.query(
      `INSERT INTO dot_adherence (beneficiary_id, taken_date, created_at) 
       VALUES (?, ?, NOW())`,
      [beneficiaryId, today]
    );

    console.log('[DOT] IFA marked as taken. Record ID:', result.insertId);

    // Check for missed doses and send alerts if needed
    await checkAndSendMissedDoseAlerts(beneficiaryId);

    res.json({
      success: true,
      message: 'IFA intake recorded successfully',
      recordId: result.insertId
    });
  } catch (error) {
    console.error('[DOT] Mark IFA taken error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record IFA intake'
    });
  }
});

// Get adherence report for admin dashboard
router.get('/adherence-report', authenticateToken, async (req, res) => {
  try {
    console.log('[DOT] Getting adherence report for admin');

    // Get all beneficiaries with IFA interventions
    const [beneficiaries] = await pool.query(
      `SELECT b.id, b.name, b.short_id, b.phone, b.alt_phone, b.doctor_name, b.doctor_phone,
              i.ifa_yes, i.ifa_quantity, i.created_at as intervention_date
       FROM beneficiaries b
       INNER JOIN (
         SELECT beneficiary_id, ifa_yes, ifa_quantity, created_at,
                ROW_NUMBER() OVER (PARTITION BY beneficiary_id ORDER BY created_at DESC) as rn
         FROM interventions
         WHERE ifa_yes = 1
       ) i ON b.short_id = i.beneficiary_id AND i.rn = 1
       ORDER BY b.name`
    );

    const adherenceReport = [];

    for (const beneficiary of beneficiaries) {
      // Get adherence data for this beneficiary
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const [adherenceRecords] = await pool.query(
        `SELECT * FROM dot_adherence 
         WHERE beneficiary_id = ? AND DATE(taken_date) >= ?
         ORDER BY taken_date DESC`,
        [beneficiary.id, startDate]
      );

      const totalDays = 30;
      const takenDays = adherenceRecords.length;
      const adherencePercentage = totalDays > 0 ? Math.round((takenDays / totalDays) * 100) : 0;

      // Check consecutive missed days
      const today = new Date().toISOString().split('T')[0];
      const [recentRecords] = await pool.query(
        `SELECT taken_date FROM dot_adherence 
         WHERE beneficiary_id = ? AND DATE(taken_date) >= ?
         ORDER BY taken_date DESC
         LIMIT 1`,
        [beneficiary.id, startDate]
      );

      let consecutiveMissedDays = 0;
      if (recentRecords.length > 0) {
        const lastTakenDate = new Date(recentRecords[0].taken_date);
        const todayDate = new Date(today);
        consecutiveMissedDays = Math.floor((todayDate - lastTakenDate) / (1000 * 60 * 60 * 24));
      } else {
        consecutiveMissedDays = totalDays;
      }

      adherenceReport.push({
        beneficiaryId: beneficiary.id,
        name: beneficiary.name,
        shortId: beneficiary.short_id,
        phone: beneficiary.phone,
        altPhone: beneficiary.alt_phone,
        doctorName: beneficiary.doctor_name,
        doctorPhone: beneficiary.doctor_phone,
        ifaQuantity: beneficiary.ifa_quantity,
        interventionDate: beneficiary.intervention_date,
        adherencePercentage,
        takenDays,
        missedDays: totalDays - takenDays,
        consecutiveMissedDays,
        needsAlert: consecutiveMissedDays >= 3
      });
    }

    // Sort by adherence percentage (lowest first)
    adherenceReport.sort((a, b) => a.adherencePercentage - b.adherencePercentage);

    res.json({
      success: true,
      report: adherenceReport,
      summary: {
        totalBeneficiaries: adherenceReport.length,
        averageAdherence: adherenceReport.length > 0 
          ? Math.round(adherenceReport.reduce((sum, item) => sum + item.adherencePercentage, 0) / adherenceReport.length)
          : 0,
        needsAlert: adherenceReport.filter(item => item.needsAlert).length
      }
    });
  } catch (error) {
    console.error('[DOT] Adherence report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get adherence report'
    });
  }
});

// Helper function to check and send missed dose alerts
async function checkAndSendMissedDoseAlerts(beneficiaryId) {
  try {
    // Get beneficiary details
    const [beneficiaries] = await pool.query(
      `SELECT b.*, i.ifa_yes, i.ifa_quantity 
       FROM beneficiaries b
       INNER JOIN (
         SELECT beneficiary_id, ifa_yes, ifa_quantity,
                ROW_NUMBER() OVER (PARTITION BY beneficiary_id ORDER BY created_at DESC) as rn
         FROM interventions
         WHERE ifa_yes = 1
       ) i ON b.short_id = i.beneficiary_id AND i.rn = 1
       WHERE b.id = ?`,
      [beneficiaryId]
    );

    if (beneficiaries.length === 0) return;

    const beneficiary = beneficiaries[0];

    // Check consecutive missed days
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const [recentRecords] = await pool.query(
      `SELECT taken_date FROM dot_adherence 
       WHERE beneficiary_id = ? AND DATE(taken_date) >= ?
       ORDER BY taken_date DESC
       LIMIT 1`,
      [beneficiaryId, startDate]
    );

    let consecutiveMissedDays = 0;
    if (recentRecords.length > 0) {
      const lastTakenDate = new Date(recentRecords[0].taken_date);
      const todayDate = new Date(today);
      consecutiveMissedDays = Math.floor((todayDate - lastTakenDate) / (1000 * 60 * 60 * 24));
    } else {
      consecutiveMissedDays = 30; // No records in last 30 days
    }

    // Log missed days (SMS is handled by native frontend)
    if (consecutiveMissedDays >= 3) {
      console.log(`[DOT] Alert: Beneficiary ${beneficiary.short_id} has missed ${consecutiveMissedDays} days`);
      // SMS notifications are handled by the native frontend
    }
  } catch (error) {
    console.error('[DOT] Error in missed dose alert check:', error);
  }
}

module.exports = router;
