// src/db/sqlite.js
import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(false); // using callback API here

let db = null;

const initDatabase = () => {
  if (db) return db;
  
  try {
    db = SQLite.openDatabase({ name: 'health.db', location: 'default' }, () => {
      console.log('[sqlite] DB opened');
    }, (err) => {
      console.warn('[sqlite] open error', err);
    });
    return db;
  } catch (error) {
    console.error('[sqlite] Database initialization failed:', error);
    return null;
  }
};

export const getDatabase = () => {
  const database = initDatabase();
  if (!database) {
    throw new Error('Database not initialized');
  }
  return database;
};

export const createTables = () => {
  const database = initDatabase();
  if (!database) {
    console.error('[sqlite] Cannot create tables - database not initialized');
    return;
  }
  
  database.transaction(tx => {
    tx.executeSql(`CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT,
      short_id TEXT,
      id_number TEXT,
      name TEXT,
      age INTEGER,
      category TEXT,
      address TEXT,
      phone TEXT,
      alt_phone TEXT,
      dob TEXT,
      registration_date TEXT,
      location TEXT,
      front_document TEXT,
      back_document TEXT,
      followUpDue TEXT,
      followUpDone INTEGER DEFAULT 0,
      last_modified TEXT,
      aadhaar_hash TEXT,
      doctor_name TEXT,
      doctor_phone TEXT
    );`);

    // Helper to conditionally add columns only if missing
    const ensureColumn = (table, column, type) => {
      tx.executeSql(`PRAGMA table_info(${table});`, [], (_tx, res) => {
        let exists = false;
        for (let i = 0; i < res.rows.length; i++) {
          if (String(res.rows.item(i)?.name || '') === column) { exists = true; break; }
        }
        if (!exists) {
          tx.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`, [], () => {}, () => false);
        }
      }, () => false);
    };

    // Indexes and conditional migrations
    tx.executeSql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_aadhaar_hash ON Users(aadhaar_hash);`);
    ensureColumn('Users', 'short_id', 'TEXT');
    ensureColumn('Users', 'alt_phone', 'TEXT');
    ensureColumn('Users', 'dob', 'TEXT');
    ensureColumn('Users', 'doctor_name', 'TEXT');
    ensureColumn('Users', 'doctor_phone', 'TEXT');
    tx.executeSql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_short_id ON Users(short_id);`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS Screening (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER,
      hb REAL,
      mcv REAL,
      mch REAL,
      mchc REAL,
      rdw REAL,
      classification TEXT,
      type TEXT,
      symptoms TEXT,
      severity TEXT,
      createdAt TEXT,
      FOREIGN KEY (beneficiary_id) REFERENCES Users(id)
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS Interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER,
      ifa_yes INTEGER,
      ifa_qty INTEGER,
      calcium_yes INTEGER,
      calcium_qty INTEGER,
      deworm_yes INTEGER,
      deworm_date TEXT,
      therapeutic_yes INTEGER,
      therapeutic_details TEXT,
      referral_yes INTEGER,
      referral_facility TEXT,
      createdAt TEXT,
      FOREIGN KEY (beneficiary_id) REFERENCES Users(id)
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS FollowUps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER,
      visit_date TEXT,
      hb REAL,
      mcv REAL,
      mch REAL,
      mchc REAL,
      rdw REAL,
      ifa_days INTEGER,
      side_effects TEXT,
      remarks TEXT,
      FOREIGN KEY (beneficiary_id) REFERENCES Users(id)
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS Counselling (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER,
      ifa INTEGER,
      diet INTEGER,
      side_effects INTEGER,
      deworming INTEGER,
      pregnant_advice INTEGER,
      followup_importance INTEGER,
      FOREIGN KEY (beneficiary_id) REFERENCES Users(id)
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS AuditLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT,
      action TEXT,
      table_name TEXT,
      record_key TEXT,
      payload TEXT,
      createdAt TEXT
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS Outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      op TEXT,             -- INSERT | UPDATE | SCREENING | INTERVENTION | REFERRAL
      entity TEXT,         -- Users | Screening | Interventions | FollowUps
      payload TEXT,        -- JSON string
      try_count INTEGER DEFAULT 0,
      last_error TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );`);

    // Simple Admins table
    tx.executeSql(`CREATE TABLE IF NOT EXISTS Admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );`);
  }, (txErr) => {
    console.warn('[sqlite] createTables tx error', txErr);
  }, () => {
    console.log('[sqlite] createTables success');
  });
};

// ---------------- CRUD helpers ----------------

const logAudit = (actor, action, tableName, recordKey, payloadObj) => {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO AuditLogs (actor, action, table_name, record_key, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [
      actor || 'system',
      action,
      tableName,
      String(recordKey || ''),
      JSON.stringify(payloadObj || {}),
      new Date().toISOString(),
    ];
    db.transaction(tx => {
      tx.executeSql(sql, params, (_tx, res) => resolve(res), (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

export const addBeneficiary = (beneficiary) => {
  return new Promise((resolve, reject) => {
    try {
      db.transaction(tx => {
        const sql = `INSERT INTO Users 
          (unique_id, short_id, id_number, name, age, category, address, phone, alt_phone, dob, registration_date, location, front_document, back_document, followUpDue, aadhaar_hash, doctor_name, doctor_phone)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
          beneficiary.unique_id,
          beneficiary.short_id || null,
          beneficiary.id_number || null,
          beneficiary.name || null,
          beneficiary.age != null ? beneficiary.age : null,
          beneficiary.category || null,
          beneficiary.address || null,
          beneficiary.phone || null,
          beneficiary.alt_phone || null,
          beneficiary.dob || null,
          beneficiary.registration_date || null,
          beneficiary.location || null,
          beneficiary.front_document || null,
          beneficiary.back_document || null,
          beneficiary.followUpDue || null,
          beneficiary.aadhaar_hash || null,
          beneficiary.doctor_name || null,
          beneficiary.doctor_phone || null,
        ];
        console.log('[sqlite] addBeneficiary SQL params:', params);
        tx.executeSql(sql, params,
          (_tx, result) => resolve(result),
          (_tx, error) => {
            console.warn('[sqlite] insert error callback', error);
            reject(new Error(error?.message || JSON.stringify(error)));
            return false;
          }
        );
      }, (txErr) => {
        console.warn('[sqlite] transaction error', txErr);
        reject(new Error(txErr?.message || JSON.stringify(txErr)));
      });
    } catch (e) {
      console.warn('[sqlite] addBeneficiary exception', e);
      reject(e);
    }
  });
};

export const getAllBeneficiaries = (limit = 1000) => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM Users ORDER BY registration_date DESC LIMIT ?;',
          [limit],
          (_tx, result) => {
            const rows = [];
            for (let i = 0; i < result.rows.length; i++) { 
              rows.push(result.rows.item(i)); 
            }
            resolve(rows);
          },
          (_tx, error) => {
            reject(error);
            return false;
          }
        );
      }, (txErr) => reject(txErr));
    } catch (error) {
      reject(error);
    }
  });
};

export const getBeneficiaryById = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Users WHERE id = ?;',
        [id],
        (_tx, result) => {
          if (result.rows.length > 0) { resolve(result.rows.item(0)); }
          else { resolve(null); }
        },
        (_tx, error) => { reject(error); return false; }
      );
    }, (txErr) => reject(txErr));
  });
};

export const getBeneficiaryByUniqueId = (uniqueId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Users WHERE unique_id = ? LIMIT 1;',
        [uniqueId],
        (_tx, result) => {
          if (result.rows.length > 0) { resolve(result.rows.item(0)); }
          else { resolve(null); }
        },
        (_tx, error) => { reject(error); return false; }
      );
    }, (txErr) => reject(txErr));
  });
};

export const getBeneficiaryByAadhaarHash = (aadhaarHash) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Users WHERE aadhaar_hash = ? LIMIT 1;',
        [aadhaarHash],
        (_tx, result) => {
          if (result.rows.length > 0) { resolve(result.rows.item(0)); }
          else { resolve(null); }
        },
        (_tx, error) => { reject(error); return false; }
      );
    }, (txErr) => reject(txErr));
  });
};

export const updateBeneficiaryByUniqueId = (uniqueId, patch) => {
  return new Promise((resolve, reject) => {
    const keys = Object.keys(patch || {});
    if (!keys.length) { return resolve({ rowsAffected: 0 }); }
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => patch[k]);
    const sql = `UPDATE Users SET ${sets}, last_modified = ? WHERE unique_id = ?`;
    params.push(new Date().toISOString());
    params.push(uniqueId);
    db.transaction(tx => {
      tx.executeSql(sql, params, async (_tx, res) => {
        try { await logAudit('system', 'UPDATE', 'Users', uniqueId, patch); } catch (e) { /* noop */ }
        try { await enqueueOutbox('UPDATE', 'Users', { unique_id: uniqueId, patch }); } catch (_) {}
        resolve(res);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

export const updateBeneficiaryImagesById = (id, images) => {
  // images: { front_document_uri?: string, back_document_uri?: string }
  return new Promise((resolve, reject) => {
    const keys = Object.keys(images);
    if (!keys.length) { return resolve({ rowsAffected: 0 }); }
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => images[k]);
    // add last_modified
    const sql = `UPDATE Users SET ${sets}, last_modified = ? WHERE id = ?`;
    params.push(new Date().toISOString());
    params.push(id);
    db.transaction(tx => {
      tx.executeSql(sql, params, (_tx, res) => resolve(res), (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

// Screening insert
export const addScreening = (beneficiaryId, visit) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO Screening (beneficiary_id, hb, mcv, mch, mchc, rdw, classification, type, symptoms, severity, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      beneficiaryId || null,
      visit?.hb ?? null,
      visit?.mcv ?? null,
      visit?.mch ?? null,
      visit?.mchc ?? null,
      visit?.rdw ?? null,
      visit?.classification || null,
      visit?.type || null,
      visit?.symptoms || null,
      visit?.severity || null,
      visit?.createdAt || new Date().toISOString(),
    ];
    db.transaction(tx => {
      tx.executeSql(sql, params, async (_tx, res) => {
        try { await logAudit('system', 'INSERT', 'Screening', beneficiaryId, visit); } catch (e) { /* noop */ }
        resolve(res);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

// Interventions insert
export const addIntervention = (beneficiaryId, payload) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO Interventions (beneficiary_id, ifa_yes, ifa_qty, calcium_yes, calcium_qty, deworm_yes, deworm_date, therapeutic_yes, therapeutic_details, referral_yes, referral_facility, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      beneficiaryId,
      payload?.ifa_yes ?? (payload?.ifaQty ? 1 : 0),
      payload?.ifaQty ?? null,
      payload?.calcium_yes ?? (payload?.calciumQty ? 1 : 0),
      payload?.calciumQty ?? null,
      payload?.deworm_yes ?? (payload?.dewormingDate ? 1 : 0),
      payload?.dewormingDate || null,
      payload?.therapeutic_yes ?? (payload?.therapeuticNotes ? 1 : 0),
      payload?.therapeuticNotes || null,
      payload?.referral_yes ?? (payload?.referralTo ? 1 : 0),
      payload?.referralTo || null,
      payload?.createdAt || new Date().toISOString(),
    ];
    db.transaction(tx => {
      tx.executeSql(sql, params, async (_tx, res) => {
        try { await logAudit('system', 'INSERT', 'Interventions', beneficiaryId, payload); } catch (e) { /* noop */ }
        resolve(res);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

// Simple referrals table using FollowUps if needed, or create a minimal Referrals table
export const addReferral = (beneficiaryId, data) => {
  return new Promise((resolve, reject) => {
    // store minimal referral in FollowUps table remarks if dedicated table not present
    const sql = 'INSERT INTO FollowUps (beneficiary_id, visit_date, hb, remarks) VALUES (?, ?, ?, ?)';
    const params = [
      beneficiaryId || null,
      data?.createdAt || new Date().toISOString(),
      data?.hb ?? null,
      data?.reason || 'Referral',
    ];
    db.transaction(tx => {
      tx.executeSql(sql, params, (_tx, res) => resolve(res), (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

export const getExportDataset = (limit = 1000) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        u.id,
        u.unique_id,
        u.id_number,
        u.name,
        u.age,
        u.category,
        u.address,
        u.phone,
        u.registration_date,
        u.location,
        u.front_document,
        u.back_document,
        u.followUpDue,
        u.followUpDone,
        u.last_modified,
        (
          SELECT s.hb FROM Screening s 
          WHERE s.beneficiary_id = u.id 
          ORDER BY datetime(s.createdAt) DESC LIMIT 1
        ) AS lastHb,
        (
          SELECT s.severity FROM Screening s 
          WHERE s.beneficiary_id = u.id 
          ORDER BY datetime(s.createdAt) DESC LIMIT 1
        ) AS lastSeverity,
        (
          SELECT s.createdAt FROM Screening s 
          WHERE s.beneficiary_id = u.id 
          ORDER BY datetime(s.createdAt) DESC LIMIT 1
        ) AS lastScreenedAt,
        (
          SELECT i.ifa_yes FROM Interventions i 
          WHERE i.beneficiary_id = u.id 
          ORDER BY datetime(i.createdAt) DESC LIMIT 1
        ) AS last_ifa_yes,
        (
          SELECT i.ifa_qty FROM Interventions i 
          WHERE i.beneficiary_id = u.id 
          ORDER BY datetime(i.createdAt) DESC LIMIT 1
        ) AS last_ifa_qty,
        (
          SELECT i.calcium_yes FROM Interventions i 
          WHERE i.beneficiary_id = u.id 
          ORDER BY datetime(i.createdAt) DESC LIMIT 1
        ) AS last_calcium_yes,
        (
          SELECT i.calcium_qty FROM Interventions i 
          WHERE i.beneficiary_id = u.id 
          ORDER BY datetime(i.createdAt) DESC LIMIT 1
        ) AS last_calcium_qty,
        (
          SELECT i.deworm_yes FROM Interventions i 
          WHERE i.beneficiary_id = u.id 
          ORDER BY datetime(i.createdAt) DESC LIMIT 1
        ) AS last_deworm_yes
      FROM Users u 
      ORDER BY datetime(u.registration_date) DESC 
      LIMIT ?;`;
    db.transaction(tx => {
      tx.executeSql(sql, [limit], (_tx, result) => {
        const rows = [];
        for (let i = 0; i < result.rows.length; i++) { rows.push(result.rows.item(i)); }
        resolve(rows);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

export const enqueueOutbox = (op, entity, payloadObj) => {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO Outbox (op, entity, payload, try_count, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)';
    const now = new Date().toISOString();
    const params = [op, entity, JSON.stringify(payloadObj || {}), now, now];
    db.transaction(tx => {
      tx.executeSql(sql, params, (_tx, res) => resolve(res), (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

export const getPendingOutbox = (limit = 50) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM Outbox ORDER BY id ASC LIMIT ?;', [limit], (_tx, result) => {
        const rows = [];
        for (let i = 0; i < result.rows.length; i++) { rows.push(result.rows.item(i)); }
        resolve(rows);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

export const markOutboxSuccess = (id) => {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM Outbox WHERE id = ?';
    db.transaction(tx => {
      tx.executeSql(sql, [id], (_tx, res) => resolve(res), (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

export const markOutboxError = (id, errorMessage) => {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE Outbox SET try_count = try_count + 1, last_error = ?, updatedAt = ? WHERE id = ?';
    const now = new Date().toISOString();
    db.transaction(tx => {
      tx.executeSql(sql, [String(errorMessage || ''), now, id], (_tx, res) => resolve(res), (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  });
};

// --- Admin helpers ---
export const ensureDefaultAdmin = () => new Promise((resolve, reject) => {
  try {
    db.transaction(tx => {
      tx.executeSql('INSERT OR IGNORE INTO Admins (username, password) VALUES (?, ?);', ['admin', 'admin'], () => resolve(true), (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  } catch (e) { reject(e); }
});

export const getAdminCount = () => new Promise((resolve, reject) => {
  try {
    db.transaction(tx => {
      tx.executeSql('SELECT COUNT(*) as c FROM Admins;', [], (_tx, res) => {
        const c = res?.rows?.item(0)?.c ?? 0;
        resolve(Number(c));
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  } catch (e) { reject(e); }
});

export const createAdmin = (username, password) => new Promise((resolve, reject) => {
  try {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT OR IGNORE INTO Admins (username, password) VALUES (?, ?);',
        [username, password],
        (_tx, res) => resolve((res?.rowsAffected ?? 0) > 0),
        (_tx, err) => { reject(err); return false; }
      );
    }, (txErr) => reject(txErr));
  } catch (e) { reject(e); }
});

export const verifyAdmin = (username, password) => new Promise((resolve, reject) => {
  try {
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM Admins WHERE username = ? AND password = ? LIMIT 1;', [username, password], (_tx, res) => {
        resolve(res.rows.length > 0);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  } catch (e) { reject(e); }
});

export const getAdminByUsername = (username) => new Promise((resolve, reject) => {
  try {
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM Admins WHERE username = ? LIMIT 1;', [username], (_tx, res) => {
        resolve(res.rows.length > 0 ? res.rows.item(0) : null);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  } catch (e) { reject(e); }
});

export const updateAdminPassword = (username, newPassword) => new Promise((resolve, reject) => {
  try {
    db.transaction(tx => {
      tx.executeSql('UPDATE Admins SET password = ? WHERE username = ?;', [newPassword, username], (_tx, res) => {
        resolve(res.rowsAffected > 0);
      }, (_tx, err) => { reject(err); return false; });
    }, (txErr) => reject(txErr));
  } catch (e) { reject(e); }
});

export default db;
