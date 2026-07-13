const db = require('./db');

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function resolveSegmentCustomers(userId, filters = {}) {
  const {
    tagIds = [],
    tagMatch = 'any',
    hasEmail,
    hasPhone,
    lastVisitBeforeDays,
    lastVisitAfterDays
  } = filters;

  let query = `
    SELECT c.*, 
      (SELECT count(*) FROM customer_vehicles WHERE customer_id = c.id AND user_id = ?) as vehicle_count,
      (SELECT MAX(date) FROM service_history sh JOIN customer_vehicles cv ON sh.vehicle_id = cv.id WHERE cv.customer_id = c.id AND sh.user_id = ?) as last_visit
    FROM customers c 
    WHERE c.user_id = ?
  `;

  const params = [userId, userId, userId];

  // Filters
  if (Array.isArray(tagIds) && tagIds.length > 0) {
    const safeTagIds = tagIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (safeTagIds.length > 0) {
      if (tagMatch === 'all') {
        query += ` AND c.id IN (
          SELECT customer_id 
          FROM customer_tags 
          WHERE tag_id IN (${safeTagIds.join(',')}) 
          GROUP BY customer_id 
          HAVING count(DISTINCT tag_id) = ${safeTagIds.length}
        )`;
      } else {
        query += ` AND c.id IN (
          SELECT customer_id 
          FROM customer_tags 
          WHERE tag_id IN (${safeTagIds.join(',')})
        )`;
      }
    }
  }

  if (hasEmail === true) {
    query += ` AND c.email IS NOT NULL AND c.email != ''`;
  } else if (hasEmail === false) {
    query += ` AND (c.email IS NULL OR c.email = '')`;
  }

  if (hasPhone === true) {
    query += ` AND c.phone IS NOT NULL AND c.phone != ''`;
  } else if (hasPhone === false) {
    query += ` AND (c.phone IS NULL OR c.phone = '')`;
  }

  if (typeof lastVisitBeforeDays === 'number' && !isNaN(lastVisitBeforeDays)) {
    const dateStr = getDateDaysAgo(lastVisitBeforeDays);
    query += ` AND (
      SELECT MAX(date) 
      FROM service_history sh 
      JOIN customer_vehicles cv ON sh.vehicle_id = cv.id 
      WHERE cv.customer_id = c.id AND sh.user_id = ?
    ) <= ?`;
    params.push(userId, dateStr);
  }

  if (typeof lastVisitAfterDays === 'number' && !isNaN(lastVisitAfterDays)) {
    const dateStr = getDateDaysAgo(lastVisitAfterDays);
    query += ` AND (
      SELECT MAX(date) 
      FROM service_history sh 
      JOIN customer_vehicles cv ON sh.vehicle_id = cv.id 
      WHERE cv.customer_id = c.id AND sh.user_id = ?
    ) >= ?`;
    params.push(userId, dateStr);
  }

  query += ` ORDER BY c.name ASC`;

  const rows = db.prepare(query).all(...params);

  // Join the tags back to the customers so the list returned is complete!
  const allCustomerTags = db.prepare(`
    SELECT ct.customer_id, t.id, t.name, t.color
    FROM customer_tags ct
    JOIN tags t ON ct.tag_id = t.id
    WHERE t.user_id = ?
  `).all(userId);

  const tagsMap = {};
  allCustomerTags.forEach(ct => {
    if (!tagsMap[ct.customer_id]) {
      tagsMap[ct.customer_id] = [];
    }
    tagsMap[ct.customer_id].push({ id: ct.id, name: ct.name, color: ct.color });
  });

  rows.forEach(row => {
    row.tags = tagsMap[row.id] || [];
  });

  return rows;
}

module.exports = {
  resolveSegmentCustomers
};
