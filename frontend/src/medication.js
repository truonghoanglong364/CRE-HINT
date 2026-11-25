export const SLOTS = [
  { key: 'morning', label: 'Sáng', time: '08:00' },
  { key: 'noon', label: 'Trưa', time: '12:00' },
  { key: 'afternoon', label: 'Chiều', time: '16:00' },
  { key: 'evening', label: 'Tối', time: '20:00' },
]

export const SLOT_LABELS = Object.fromEntries(SLOTS.map((s) => [s.key, s.label]))

export const SKIP_REASONS = [
  { key: 'forgot', label: 'Quên uống' },
  { key: 'side_effect', label: 'Tác dụng phụ' },
  { key: 'out_of_stock', label: 'Hết thuốc' },
  { key: 'other', label: 'Lý do khác' },
]

export const SKIP_REASON_LABELS = Object.fromEntries(SKIP_REASONS.map((r) => [r.key, r.label]))

export const COMMON_DRUGS = [
  'Bisoprolol', 'Carvedilol', 'Metoprolol', 'Furosemide', 'Torsemide', 'Spironolactone', 'Eplerenone',
  'Enalapril', 'Lisinopril', 'Ramipril', 'Losartan', 'Valsartan', 'Sacubitril/Valsartan', 'Dapagliflozin',
  'Empagliflozin', 'Digoxin', 'Amiodarone', 'Ivabradine', 'Amlodipine', 'Atorvastatin', 'Rosuvastatin',
  'Aspirin', 'Clopidogrel', 'Warfarin', 'Apixaban', 'Rivaroxaban', 'Kali clorid',
]

export function formatSlots(slots) {
  return slots.map((s) => SLOT_LABELS[s]).join(', ')
}

export function formatDuration(item) {
  return item.durationDays ? `${item.durationDays} ngày` : 'Dài hạn'
}

export function formatShortDate(dateStr) {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

export function adherenceTone(value) {
  if (value == null) return 'none'
  if (value >= 80) return 'good'
  if (value >= 50) return 'fair'
  return 'poor'
}

let nextEditorKey = 1

export function newEditorItem(item = {}) {
  return {
    key: nextEditorKey++,
    drugName: item.drugName || '',
    dose: item.dose || '',
    slots: item.slots || ['morning'],
    durationDays: item.durationDays ?? '',
    instructions: item.instructions || '',
  }
}

export function toEditorItems(items) {
  return (items || []).map(newEditorItem)
}

export function toApiItems(items) {
  return items.map(({ drugName, dose, slots, durationDays, instructions }) => ({
    drugName,
    dose,
    slots,
    durationDays: durationDays === '' ? null : Number(durationDays),
    instructions,
  }))
}

export function validateItems(items) {
  for (const [index, item] of items.entries()) {
    if (!item.drugName.trim()) return `Dòng thuốc ${index + 1}: chưa nhập tên thuốc.`
    if (item.slots.length === 0) return `${item.drugName.trim()}: chọn ít nhất một buổi uống.`
  }
  return null
}

export async function fetchMyMedications(token) {
  const response = await fetch('/api/medications/mine', { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Không thể tải đơn thuốc.')
  return data
}

export async function recordDose(token, medicationId, body) {
  const response = await fetch(`/api/medications/${medicationId}/doses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Không thể ghi nhận liều thuốc.')
  return data
}
