import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
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

function saveLocalExpenses(expenses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    // Keep the in-memory experience working if browser storage is unavailable.
  }
}

function fromExpenseRow(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    note: row.note,
    createdAt: row.created_at,
  }
}

function toExpenseRow(expense, ownerId) {
  return {
    id: expense.id,
    owner_id: ownerId,
    amount: expense.amount,
    category: expense.category,
    note: expense.note,
    created_at: expense.createdAt,
  }
}

function AuthPanel({ session, onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  async function submitAuth(event) {
    event.preventDefault()
    setMessage(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致，请重新确认。' })
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error

        if (data.session) {
          onClose()
        } else {
          setMessage({ type: 'success', text: '账号已创建。请前往邮箱完成验证后再登录。' })
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        onClose()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '操作失败，请稍后再试。',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function signOut() {
    setSubmitting(true)
    setMessage(null)
    const { error } = await supabase.auth.signOut()
    setSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    onClose()
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  return (
    <div className="scrim auth-scrim" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button auth-close" type="button" onClick={onClose} aria-label="关闭账号面板">
          ×
        </button>

        {session ? (
          <div className="signed-in-panel">
            <span className="account-orbit" aria-hidden="true" />
            <p className="section-index">YOUR ACCOUNT</p>
            <h2 id="auth-title">已经登录</h2>
            <p className="account-email">{session.user.email}</p>
            <p className="auth-helper">消费记录仍只保存在这台设备的浏览器中。</p>
            {message && <p className={`auth-message is-${message.type}`} role="status">{message.text}</p>}
            <button className="auth-submit auth-signout" type="button" onClick={signOut} disabled={submitting}>
              {submitting ? '正在退出…' : '退出登录'}
            </button>
          </div>
        ) : (
          <>
            <p className="section-index">SPENDARY ACCOUNT</p>
            <h2 id="auth-title">{mode === 'login' ? '欢迎回来' : '创建你的账号'}</h2>
            <p className="auth-helper">
              {mode === 'login' ? '用邮箱和密码继续记录今天。' : '创建后可能需要前往邮箱完成验证。'}
            </p>

            <div className="auth-tabs" aria-label="账号操作">
              <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>
                登录
              </button>
              <button type="button" className={mode === 'signup' ? 'is-active' : ''} onClick={() => switchMode('signup')}>
                创建账号
              </button>
            </div>

            <form className="auth-form" onSubmit={submitAuth}>
              <label>
                <span>邮箱</span>
                <input
                  autoFocus
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                <span>密码</span>
                <input
                  required
                  minLength="6"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 6 位"
                />
              </label>
              {mode === 'signup' && (
                <label>
                  <span>再次输入密码</span>
                  <input
                    required
                    minLength="6"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    aria-invalid={Boolean(message?.type === 'error' && password !== confirmPassword)}
                    placeholder="再次确认密码"
                  />
                </label>
              )}

              {message && <p className={`auth-message is-${message.type}`} role="status">{message.text}</p>}
              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

function App() {
  const [expenses, setExpenses] = useState(loadExpenses)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [cloudReady, setCloudReady] = useState(false)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [note, setNote] = useState('')

  const selectedExpense = expenses.find((expense) => expense.id === selectedId)
  const ownerId = session?.user.id
  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  )

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setAuthReady(true)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setExpenses(loadExpenses())
        setSelectedId(null)
        setComposerOpen(false)
      }
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady) return undefined

    if (!ownerId) {
      setCloudReady(true)
      setExpenses(loadExpenses())
      return undefined
    }

    let cancelled = false

    async function syncExpenses() {
      setCloudReady(false)
      const localExpenses = loadExpenses()

      try {
        const { data: existingRows, error: readError } = await supabase
          .from('expenses')
          .select('id, amount, category, note, created_at')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true })

        if (readError) throw readError

        const existingIds = new Set(existingRows.map((row) => row.id))
        const missingExpenses = localExpenses.filter((expense) => !existingIds.has(expense.id))

        if (missingExpenses.length > 0) {
          const { error: insertError } = await supabase
            .from('expenses')
            .insert(missingExpenses.map((expense) => toExpenseRow(expense, ownerId)))

          if (insertError) throw insertError
        }

        const { data: confirmedRows, error: confirmError } = await supabase
          .from('expenses')
          .select('id, amount, category, note, created_at')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true })

        if (confirmError) throw confirmError

        const confirmedIds = new Set(confirmedRows.map((row) => row.id))
        const migrationComplete = localExpenses.every((expense) => confirmedIds.has(expense.id))

        if (!migrationComplete) {
          throw new Error('Local expense migration could not be verified.')
        }

        if (localStorage.getItem(STORAGE_KEY) !== null) {
          localStorage.removeItem(STORAGE_KEY)
        }

        if (!cancelled) {
          setExpenses(confirmedRows.map(fromExpenseRow))
        }
      } catch (error) {
        console.error('Unable to sync expenses with Supabase.', error)
        if (!cancelled) {
          setExpenses(localExpenses)
        }
      } finally {
        if (!cancelled) setCloudReady(true)
      }
    }

    syncExpenses()

    return () => {
      cancelled = true
    }
  }, [authReady, ownerId])

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

  async function addExpense(event) {
    event.preventDefault()
    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || expenseSaving) return

    const nextExpense = {
      id: crypto.randomUUID(),
      amount: Math.round(numericAmount * 100) / 100,
      category,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    }

    if (session) {
      if (!cloudReady) return
      setExpenseSaving(true)
      const { data, error } = await supabase
        .from('expenses')
        .insert(toExpenseRow(nextExpense, session.user.id))
        .select('id, amount, category, note, created_at')
        .single()
      setExpenseSaving(false)

      if (error) {
        console.error('Unable to add expense.', error)
        return
      }

      setExpenses((current) => [...current, fromExpenseRow(data)])
    } else {
      setExpenses((current) => {
        const nextExpenses = [...current, nextExpense]
        saveLocalExpenses(nextExpenses)
        return nextExpenses
      })
    }

    setAmount('')
    setCategory('food')
    setNote('')
    setComposerOpen(false)
  }

  async function deleteExpense(id) {
    if (expenseSaving) return

    if (session) {
      if (!cloudReady) return
      setExpenseSaving(true)
      const { data, error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('owner_id', session.user.id)
        .select('id')
      setExpenseSaving(false)

      if (error || data.length !== 1) {
        console.error('Unable to delete expense.', error ?? new Error('Expense was not deleted.'))
        return
      }
    }

    setExpenses((current) => {
      const nextExpenses = current.filter((expense) => expense.id !== id)
      if (!session) saveLocalExpenses(nextExpenses)
      return nextExpenses
    })
    setSelectedId(null)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Spendary 首页">
          <span className="brand-mark" aria-hidden="true" />
          <span>SPENDARY</span>
        </a>
        <div className="topbar-actions">
          <span className="date-stamp">{today}</span>
          <button className={`account-button${session ? ' is-signed-in' : ''}`} type="button" onClick={() => setAuthOpen(true)}>
            <span className="account-status" aria-hidden="true" />
            {!authReady ? '账号' : session ? '我的账号' : '登录 / 注册'}
          </button>
        </div>
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

              <button
                className="submit-expense"
                type="submit"
                disabled={!amount || Number(amount) <= 0 || expenseSaving || (Boolean(session) && !cloudReady)}
              >
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
            <button
              className="delete-expense"
              type="button"
              onClick={() => deleteExpense(selectedExpense.id)}
              disabled={expenseSaving || (Boolean(session) && !cloudReady)}
            >
              删除这笔记录
            </button>
          </section>
        </div>
      )}

      {authOpen && <AuthPanel session={session} onClose={() => setAuthOpen(false)} />}
    </main>
  )
}

export default App
