import { useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { fmtMinutes } from '../lib/date'
import { SubHeader, PageHead } from '../components/nav'
import { Button, Card } from '../components/ui'
import { Icon } from '../components/icons'

export function SettingsPage() {
  const { state, resetDemo, clearAll, exportJSON, importJSON } = useApp()
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (tone: 'ok' | 'bad', text: string) => {
    setMessage({ tone, text })
    window.setTimeout(() => setMessage(null), 3200)
  }

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-bank-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('ok', '已导出备份文件')
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = importJSON(String(reader.result ?? ''))
      flash(res.ok ? 'ok' : 'bad', res.message)
    }
    reader.readAsText(file)
  }

  const totalMinutes = state.logs.reduce((s, l) => s + l.minutes, 0)

  return (
    <div className="screen">
      <SubHeader title="设置" onBack={() => (window.location.hash = '#/me')} />

      <PageHead title="数据与关于" sub={`${fmtMinutes(totalMinutes)} 已记录 · 全部保存在本机浏览器`} />

      {message && (
        <div className={`notice ${message.tone === 'bad' ? 'warn' : ''}`} style={{ marginBottom: 12 }}>
          <Icon name={message.tone === 'ok' ? 'check' : 'spark'} size={14} />
          <span>{message.text}</span>
        </div>
      )}

      <Card>
        <div className="block-head">
          <h2>数据管理</h2>
          <span className="meta">演示数据可随时重置</span>
        </div>
        <div className="setting-row">
          <div>
            <div className="t">重新生成演示数据</div>
            <div className="d">生成最近 30 天的示例记录，会覆盖当前数据。</div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetDemo()
              flash('ok', '演示数据已重新生成')
            }}
          >
            重新生成
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <div className="t">清空全部数据</div>
            <div className="d">从空白开始，只保留默认预算。</div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              clearAll()
              flash('ok', '已清空，开始你自己的记录吧')
            }}
          >
            清空
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div className="block-head">
          <h2>备份与迁移</h2>
          <span className="meta">JSON 文件</span>
        </div>
        <div className="setting-row">
          <div>
            <div className="t">导出数据</div>
            <div className="d">包含所有安排、时间记录与预算设置。</div>
          </div>
          <Button size="sm" onClick={download}>
            导出
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <div className="t">导入数据</div>
            <div className="d">选择此前导出的备份文件恢复。</div>
          </div>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            导入
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div className="block-head">
          <h2>关于「时间银行」</h2>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.85, color: 'var(--muted)' }}>
          一款以「时间资产」为核心，通过 AI 帮助用户记录、规划和反思个人时间使用情况的智能日程管理应用。
          核心理念不是帮你安排更多事情，而是让你真正看见自己的时间。
        </p>
        <div className="notice" style={{ marginTop: 12 }}>
          <Icon name="spark" size={14} />
          <span>Time → Data → Insight → Action → Time</span>
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div className="block-head">
          <h2>本演示版</h2>
          <span className="meta">与项目文档对应</span>
        </div>
        <ul className="muted" style={{ paddingLeft: 16, fontSize: 11.5, lineHeight: 2, margin: 0 }}>
          <li>React 19 + Vite + TypeScript，纯静态部署</li>
          <li>数据保存在 localStorage，无需后端</li>
          <li>AI 为内置规则引擎（偏差 / 节律 / 延期 / 黑洞 / 画像）</li>
          <li>正式版计划：Flutter + Supabase + LLM API</li>
        </ul>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div className="block-head">
          <h2>部署到 GitHub Pages</h2>
        </div>
        <ol className="muted" style={{ paddingLeft: 16, fontSize: 11.5, lineHeight: 2, margin: 0 }}>
          <li>把仓库推送到 GitHub</li>
          <li>Settings → Pages → Source 选择 GitHub Actions</li>
          <li>推送 main 分支后自动构建发布</li>
        </ol>
        <p className="footnote" style={{ textAlign: 'left', marginTop: 8 }}>
          仓库已内置 .github/workflows/deploy.yml，无需手动上传构建产物。
        </p>
      </Card>

      <div style={{ height: 20 }} />
    </div>
  )
}
