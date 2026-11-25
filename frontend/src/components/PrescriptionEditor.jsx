import { COMMON_DRUGS, SLOTS, newEditorItem } from '../medication'

function PrescriptionEditor({ items, onChange }) {
  const update = (key, patch) => onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  const toggleSlot = (item, slot) => update(item.key, {
    slots: item.slots.includes(slot) ? item.slots.filter((s) => s !== slot) : [...item.slots, slot],
  })
  const addRow = () => onChange([...items, newEditorItem()])
  const removeRow = (key) => onChange(items.filter((item) => item.key !== key))

  return (
    <div className="rx-editor">
      <datalist id="rx-common-drugs">
        {COMMON_DRUGS.map((name) => <option key={name} value={name} />)}
      </datalist>

      {items.length === 0 && (
        <p className="rx-empty">Chưa có thuốc nào. Nếu công bố không có thuốc, đơn đang dùng của bệnh nhân được giữ nguyên.</p>
      )}

      {items.map((item, index) => (
        <div className="rx-row" key={item.key}>
          <span className="rx-index">{index + 1}</span>
          <div className="rx-fields">
            <div className="rx-line">
              <input
                className="rx-name"
                list="rx-common-drugs"
                placeholder="Tên thuốc (vd: Bisoprolol)"
                value={item.drugName}
                onChange={(e) => update(item.key, { drugName: e.target.value })}
              />
              <input
                className="rx-dose"
                placeholder="Liều mỗi lần (vd: 2.5 mg × 1 viên)"
                value={item.dose}
                onChange={(e) => update(item.key, { dose: e.target.value })}
              />
              <input
                className="rx-days"
                type="number"
                min="1"
                max="365"
                placeholder="Dài hạn"
                title="Số ngày dùng. Để trống nếu dùng dài hạn."
                value={item.durationDays}
                onChange={(e) => update(item.key, { durationDays: e.target.value })}
              />
              <span className="rx-days-unit">ngày</span>
            </div>
            <div className="rx-line">
              <div className="rx-slots">
                {SLOTS.map((slot) => (
                  <button
                    type="button"
                    key={slot.key}
                    className={item.slots.includes(slot.key) ? 'rx-slot active' : 'rx-slot'}
                    onClick={() => toggleSlot(item, slot.key)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
              <input
                className="rx-instructions"
                placeholder="Cách dùng (vd: uống sau ăn sáng)"
                value={item.instructions}
                onChange={(e) => update(item.key, { instructions: e.target.value })}
              />
            </div>
          </div>
          <button type="button" className="rx-remove" onClick={() => removeRow(item.key)} title="Xóa thuốc này">×</button>
        </div>
      ))}

      <button type="button" className="rx-add" onClick={addRow}>+ Thêm thuốc</button>
    </div>
  )
}

export default PrescriptionEditor
