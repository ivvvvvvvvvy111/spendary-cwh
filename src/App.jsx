import { useEffect, useMemo, useState } from 'react'
import './App.css'

const CATEGORIES = [
  { id: 'food', label: '餐饮', color: '#e56b4b', soft: '#f7d5ca' },
  { id: 'transit', label: '交通', color: '#507d75', soft: '#d5e4df' },
  { id: 'shopping', label: '购物', color: '#d39a35', soft: '#f3e2bd' },
  { id: 'fun', label: '娱乐', color: '#8072a8', soft: '#dfd9ed' },
  { id: 'other', label: '其他', color: '#73736d', soft: '#deded7' },
]

const STORAGE_KEY = 'spendary.expenses.v1'

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
})

const shortMoney = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
})

const today = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
}).format(new Date())

function categoryFor(id) {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES.at(-1)
}

function loadExpenses() {
  try {
    const savedExpenses = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')

    if (!Array.isArray(savedExpenses)) return []

    return savedExpenses.filter(
      (expense) =>
        expense &&
        typeof expense.id === 'string' &&
        Number.isFinite(expense.amount) &&
        expense.amount > 0 &&
        CATEGORIES.some((category) => category.id === expense.category) &&
        typeof expense.note === 'string' &&
        typeof expense.createdAt === 'string',
    )
  } catch {
    return []
  }
}

function App() {
  const [expenses, setExpenses] = useState(loadExpenses)
  const [composerOpen, setComposerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [note, setNote] = useState('')

  const selectedExpense = expenses.find((expense) => expense.id === selectedId)
  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
    } catch {
      // Keep the in-memory experience working if browser storage is unavailable.
    }
  }, [expenses])

  useEffect(() => {
    if (!composerOpen && !selectedExpense) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setComposerOpen(false)
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [composerOpen, selectedExpense])

  function addExpense(event) {
    event.preventDefault()
    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return

    setExpenses((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        amount: Math.round(numericAmount * 100) / 100,
        category,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      },
    ])
    setAmount('')
    setCategory('food')
    setNote('')
    setComposerOpen(false)
  }

  function deleteExpense(id) {
    setExpenses((current) => current.filter((expense) => expense.id !== id))
    setSelectedId(null)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Spendary 首页">
          <span className="brand-mark" aria-hidden="true" />
          <span>SPENDARY</span>
        </a>
        <span className="date-stamp">{today}</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">TODAY'S SPENDING MAP</p>
        <h1>今天的钱，<br />留下了什么形状？</h1>
        <p className="intro-copy">
          每一笔消费都是一个圆点。大小记录金额，颜色记住去向。
        </p>
      </section>

      <div className="dashboard">
        <aside className="summary-card" aria-label="今日消费摘要">
          <span className="summary-label">今日总额</span>
          <strong className="summary-total">{money.format(total)}</strong>
          <span className="summary-count">
            {expenses.length === 0 ? '还没有消费记录' : `${expenses.length} 笔消费`}
          </span>

          <div className="legend" aria-label="消费分类图例">
            {CATEGORIES.map((item) => (
              <div className="legend-item" key={item.id}>
                <span
                  className="legend-dot"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="map-card" aria-labelledby="map-heading">
          <div className="map-heading-row">
            <div>
              <p className="section-index">01 / DAILY MAP</p>
              <h2 id="map-heading">消费地图</h2>
            </div>
            <span className="map-hint">点击圆点查看详情</span>
          </div>

          {expenses.length === 0 ? (
            <div className="empty-map">
              <div className="empty-orbit" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3>今天还是一张白纸</h3>
              <p>记录第一笔消费，让它变成地图上的第一个圆点。</p>
              <button className="empty-action" type="button" onClick={() => setComposerOpen(true)}>
                添加第一笔
              </button>
            </div>
          ) : (
            <div className="dot-map" aria-label="今日消费圆点">
              {expenses.map((expense, index) => {
                const item = categoryFor(expense.category)
                const size = Math.min(132, Math.max(72, 58 + Math.sqrt(expense.amount) * 6))
                return (
                  <button
                    className="expense-dot"
                    key={expense.id}
                    type="button"
                    onClick={() => setSelectedId(expense.id)}
                    style={{
                      '--dot-size': `${size}px`,
                      '--dot-color': item.color,
                      '--dot-soft': item.soft,
                      '--dot-delay': `${index * 35}ms`,
                    }}
                    aria-label={`${item.label}，${money.format(expense.amount)}${expense.note ? `，${expense.note}` : ''}`}
                  >
                    <span>{shortMoney.format(expense.amount)}</span>
                    <small>{item.label}</small>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <button
        className="floating-add"
        type="button"
        onClick={() => setComposerOpen(true)}
        aria-label="添加消费"
      >
        <span aria-hidden="true">＋</span>
        <span>记一笔</span>
      </button>

      {composerOpen && (
        <div className="scrim" role="presentation" onMouseDown={() => setComposerOpen(false)}>
          <section
            className="bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-header">
              <div>
                <p className="section-index">NEW ENTRY</p>
                <h2 id="composer-title">记下这笔消费</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setComposerOpen(false)} aria-label="关闭">
                ×
              </button>
            </div>

            <form className="expense-form" onSubmit={addExpense}>
              <label className="amount-field">
                <span>金额</span>
                <span className="amount-input-wrap">
                  <span>¥</span>
                  <input
                    autoFocus
                    required
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    aria-label="消费金额"
                  />
                </span>
              </label>

              <fieldset className="category-picker">
                <legend>分类</legend>
                <div className="category-grid">
                  {CATEGORIES.map((item) => (
                    <label
                      className={`category-option${category === item.id ? ' is-selected' : ''}`}
                      key={item.id}
                      style={{ '--category-color': item.color, '--category-soft': item.soft }}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={item.id}
                        checked={category === item.id}
                        onChange={() => setCategory(item.id)}
                      />
                      <span className="category-swatch" aria-hidden="true" />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="note-field">
                <span>备注 <small>选填</small></span>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength="40"
                  placeholder="例如：午后咖啡"
                />
              </label>

              <button className="submit-expense" type="submit" disabled={!amount || Number(amount) <= 0}>
                添加到今日地图
              </button>
            </form>
          </section>
        </div>
      )}

      {selectedExpense && (
        <div className="scrim detail-scrim" role="presentation" onMouseDown={() => setSelectedId(null)}>
          <section
            className="detail-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="icon-button detail-close" type="button" onClick={() => setSelectedId(null)} aria-label="关闭">
              ×
            </button>
            <span
              className="detail-dot"
              style={{ backgroundColor: categoryFor(selectedExpense.category).color }}
              aria-hidden="true"
            />
            <p className="section-index">{categoryFor(selectedExpense.category).label}</p>
            <h2 id="detail-title">{money.format(selectedExpense.amount)}</h2>
            <p className={`detail-note${selectedExpense.note ? '' : ' is-muted'}`}>
              {selectedExpense.note || '没有添加备注'}
            </p>
            <time dateTime={selectedExpense.createdAt}>
              {new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(selectedExpense.createdAt))}
            </time>
            <button className="delete-expense" type="button" onClick={() => deleteExpense(selectedExpense.id)}>
              删除这笔记录
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
