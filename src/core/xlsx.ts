import ExcelJS from 'exceljs'
import type { Tx } from './types'
import { centsToYuan } from './format'

/** 导出全部流水为 xlsx 并触发浏览器下载 */
export async function exportXlsx(txs: Tx[]): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'NOVA Ledger'
  const ws = wb.addWorksheet('流水')
  ws.columns = [
    { header: '日期', key: 'date', width: 12 },
    { header: '类型', key: 'type', width: 8 },
    { header: '金额(元)', key: 'amount', width: 12 },
    { header: '分类', key: 'category', width: 12 },
    { header: '备注', key: 'note', width: 30 },
    { header: '记录时间', key: 'createdAt', width: 20 },
    { header: '元数据', key: 'metadata', width: 40 },
  ]

  const sorted = [...txs].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  for (const t of sorted) {
    ws.addRow({
      date: t.occurredAt,
      type: t.type === 'income' ? '收入' : '支出',
      amount: Number(centsToYuan(t.amountCents)),
      category: t.category,
      note: t.note ?? '',
      createdAt: t.createdAt,
      metadata: Object.keys(t.metadata).length > 0 ? JSON.stringify(t.metadata) : '',
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `nova-ledger-${stamp}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
