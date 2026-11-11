import { useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { fmtMinutes } from '../lib/date'
import { Button, Card, SectionHead, Tag } from '../components/ui'
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
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">设置</span>
          <h1 className="page-title">数据与关于</h1>
          <p className="page-sub">所有数据都保存在这台设备的浏览器里，不会上传到任何服务器。</p>
        </div>
        <div className="topbar-actions">
          <Tag tone="good">本地存储</Tag>
          <Tag tone="neutral">{fmtMinutes(totalMinutes)} 已记录</Tag>
        </div>
      </div>

      {message && (
        <div
          className={`notice ${message.tone === 'bad' ? 'warn' : ''}`}
          style={{ marginBottom: 16 }}
        >
          <Icon name={message.tone === 'ok' ? 'check' : 'spark'} size={15} />
          <span>{message.text}</span>
        </div>
      )}

      <div className="split">
        <div className="stack">
          <Card>
            <SectionHead title="数据管理" hint="演示数据可以随时重置" />
            <div className="setting-row">
              <div>
                <div className="t">重新生成演示数据</div>
                <div className="d">
                  生成最近 30 天的示例安排与时间记录，用于展示洞察、预算与画像效果。会覆盖当前数据。
                </div>
              </div>
              <Button
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
                <div className="d">从空白开始，只保留默认预算。此操作不可撤销。</div>
              </div>
              <Button
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

          <Card>
            <SectionHead title="备份与迁移" hint="导出为 JSON 文件，可在其他设备导入" />
            <div className="setting-row">
              <div>
                <div className="t">导出数据</div>
                <div className="d">包含所有安排、时间记录与预算设置。</div>
              </div>
              <Button onClick={download}>导出 JSON</Button>
            </div>
            <div className="setting-row">
              <div>
                <div className="t">导入数据</div>
                <div className="d">选择此前导出的备份文件，恢复全部数据。</div>
              </div>
              <Button onClick={() => fileRef.current?.click()}>选择文件</Button>
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

          <Card>
            <SectionHead title="关于「时间银行」" />
            <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--ink-2)' }}>
              一款以「时间资产」为核心，通过 AI 帮助用户记录、规划和反思个人时间使用情况的智能日程管理应用。
              核心理念不是帮你安排更多事情，而是让你真正看见自己的时间。
            </p>
            <div className="notice" style={{ marginTop: 14 }}>
              <Icon name="spark" size={15} />
              <span>Time → Data → Insight → Action → Time</span>
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <SectionHead title="本演示版说明" hint="与项目文档的对应关系" />
            <ul className="muted" style={{ paddingLeft: 18, fontSize: 12.5, lineHeight: 2, margin: 0 }}>
              <li>技术栈：React 19 + Vite + TypeScript，纯静态部署</li>
              <li>数据：浏览器 localStorage，无需后端</li>
              <li>AI：内置规则引擎（偏差 / 节律 / 延期 / 黑洞 / 画像）</li>
              <li>正式版计划：Flutter + Supabase + LLM API</li>
            </ul>
            <p className="faint" style={{ fontSize: 11.5, marginTop: 12 }}>
              演示版用于验证产品逻辑与交互，数据模型与正式版保持同构。
            </p>
          </Card>

          <Card>
            <SectionHead title="部署到 GitHub Pages" hint="三步上线" />
            <ol className="muted" style={{ paddingLeft: 18, fontSize: 12.5, lineHeight: 2, margin: 0 }}>
              <li>把仓库推送到 GitHub</li>
              <li>Settings → Pages → Source 选择 GitHub Actions</li>
              <li>推送 main 分支后自动构建发布</li>
            </ol>
            <p className="faint" style={{ fontSize: 11.5, marginTop: 12 }}>
              仓库已内置 .github/workflows/deploy.yml，无需手动上传构建产物。
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
