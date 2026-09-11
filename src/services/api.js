const API_BASE = `${process.env.API_BASE}/api`;

export async function fetchEntity(entity) {
  const res = await fetch(`${API_BASE}/${entity}`);
  if (!res.ok) throw new Error(`Failed to fetch ${entity}`);
  return res.json();
}

export async function createEntity(entity, data) {
  const res = await fetch(`${API_BASE}/${entity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create ${entity}`);
  return res.json();
}

export async function deleteEntity(entity, id) {
  const res = await fetch(`${API_BASE}/${entity}/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete item from ${entity}`);
  return res.json();
}