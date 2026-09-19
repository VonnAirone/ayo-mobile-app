import { CalendarDays, Download, Printer, FileBarChart, ArrowUpRight, ClipboardCheck, Heart, StickyNote, Users } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { allPages } from '../lib/records';
import { buildReport, localDate, reportRange, reportCsv, reportCells, REPORT_HEADERS, type ReportCheckIn, type ReportNote, type ReportRow } from '../lib/reports';
import type { PriorityReview } from '../lib/priority';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

function daysAgo(days: number) { const date = new Date(); date.setDate(date.getDate() - days + 1); return localDate(date); }
interface Report { rows: ReportRow[]; notes: ReportNote[]; start: string; end: string; generated: string }

function MoodBreakdown({ row }: { row: ReportRow }) {
  const moods = [{ label: 'Happy', count: row.happy, color: 'bg-teal-500' }, { label: 'Okay', count: row.okay, color: 'bg-amber-400' }, { label: 'Struggling', count: row.struggling, color: 'bg-rose-400' }];
  const total = row.happy + row.okay + row.struggling;
  return <div className="min-w-36"><div className="flex h-1.5 overflow-hidden rounded-full bg-stone-100 mb-2" aria-hidden="true">{moods.map(mood => <span key={mood.label} className={mood.color} style={{ width: `${total ? mood.count / total * 100 : 0}%` }} />)}</div><div className="flex flex-wrap gap-x-3 gap-y-1">{moods.map(mood => <span key={mood.label} className="text-[11px] text-slate-500"><span aria-hidden="true" className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${mood.color}`} />{mood.label} {mood.count}</span>)}</div></div>;
}
function ReviewStatus({ row }: { row: ReportRow }) {
  return <div><span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${row.priority === 'Urgent follow-up' ? 'bg-rose-50 text-rose-700' : row.priority === 'Follow-up needed' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-slate-600'}`}>{row.priority}</span>{row.reviewNeeded && <p className="text-xs text-amber-700 mt-1">Review needed</p>}</div>;
}

export function CounselorReports() {
  const { profile, user } = useAuth();
  if (!user || profile?.role !== 'counselor') return null;
  return <Reports key={user.id} />;
}
function Reports() {
  const [preset, setPreset] = useState('30');
  const [start, setStart] = useState(daysAgo(30));
  const [end, setEnd] = useState(localDate());
  const [report, setReport] = useState<Report | null>(null);
  const [studentId, setStudentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setReport(null);
    try {
      const range = reportRange(start, end);
      const [profiles, entries, notes, reviews] = await Promise.all([
        allPages<{ id: string; name: string }>((from, to) => supabase.from('profiles').select('id, name').eq('role', 'student').order('id').range(from, to)),
        allPages<ReportCheckIn>((from, to) => supabase.from('check_ins').select('id, student_id, created_at, score, max_score, mood').lt('created_at', range.to).order('id').range(from, to)),
        allPages<ReportNote>((from, to) => supabase.from('follow_ups').select('id, student_id, created_at, note').lt('created_at', range.to).order('id').range(from, to)),
        allPages<PriorityReview>((from, to) => supabase.from('priority_reviews').select('*').lt('created_at', range.to).order('id').range(from, to)),
      ]);
      setStudentId('');
      setReport({ rows: buildReport(profiles, entries, notes, reviews, range.from, range.to), notes: notes.filter((note) => Date.parse(note.created_at) >= Date.parse(range.from)), start, end, generated: new Date().toISOString() });
    } catch (err) { setError(err instanceof Error && err.message.startsWith('Choose') || err instanceof Error && /date/.test(err.message) ? (err as Error).message : 'Could not generate a complete report. Please try again.'); }
    finally { setBusy(false); }
  }
  const rows = report?.rows.filter((row) => !studentId || row.id === studentId) ?? [];
  const stale = report && (report.start !== start || report.end !== end);
  const canExport = !!report && !busy && !stale && rows.length > 0;
  function download() {
    if (!report || !canExport) return;
    const url = URL.createObjectURL(new Blob([reportCsv(rows, report.start, report.end, report.generated)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `ayo-report-${report.start}-${report.end}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function printReport() {
    if (!report || !canExport) return;
    const popup = window.open('', '_blank');
    if (!popup) { toast.error('Allow pop-ups to open the printable report.'); return; }
    popup.opener = null;
    const doc = popup.document;
    doc.title = 'Ayo Counselor Report';
    const style = doc.createElement('style'); style.textContent = 'body{font:12px system-ui;margin:24px;color:#18312e}table{border-collapse:collapse;width:100%;font-size:10px}td,th{border:1px solid #ccc;padding:6px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}p{line-height:1.5}@page{size:landscape;margin:12mm}@media print{button{display:none}}'; doc.head.append(style);
    const heading = doc.createElement('h1'); heading.textContent = 'Ayo Counselor Report'; doc.body.append(heading);
    const text = doc.createElement('p'); text.textContent = `${report.start} to ${report.end} (local calendar dates). Generated ${new Date(report.generated).toLocaleString()}. Confidential. Counts cover the selected dates. Priority, review status and last check-in are as of the end date. Indicators are for counselor review, not diagnosis. No appointment records are included.`; doc.body.append(text);
    const table = doc.createElement('table'); const head = table.createTHead().insertRow();
    REPORT_HEADERS.forEach((label) => { const cell = doc.createElement('th'); cell.textContent = label; head.append(cell); });
    const body = table.createTBody(); rows.forEach((row) => { const tr = body.insertRow(); reportCells(row).forEach((value) => { tr.insertCell().textContent = String(value); }); }); doc.body.append(table);
    const print = doc.createElement('button'); print.textContent = 'Print / Save as PDF'; print.onclick = () => popup.print(); doc.body.prepend(print);
    popup.focus();
  }
  return <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-teal-700 mb-2">Counselor portal</p><h2 className="font-display text-3xl font-medium text-slate-800">Reports</h2><p className="text-sm text-slate-500 mt-2">Turn check-in history into a clearer picture of student well-being.</p></header>
    <Card className="p-5 sm:p-6 border-stone-200/80 rounded-2xl gap-4">
      <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-teal-600" /><h3 className="text-sm font-semibold text-slate-800">Report period</h3></div>
      <form onSubmit={generate} className="space-y-4">
        <div className="flex flex-wrap gap-2" aria-label="Quick date ranges">{[{value:'7',label:'7 days'},{value:'30',label:'30 days'},{value:'90',label:'90 days'},{value:'',label:'Custom'}].map(item => <button key={item.value} type="button" aria-pressed={preset === item.value} onClick={() => { setPreset(item.value); if (item.value) { setStart(daysAgo(Number(item.value))); setEnd(localDate()); } }} className={`rounded-full px-4 py-2 text-sm border transition-colors ${preset === item.value ? 'bg-teal-700 border-teal-700 text-white' : 'border-stone-200 text-slate-600 hover:bg-stone-50'}`}>{item.label}</button>)}</div>
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="min-w-0 text-xs font-medium text-slate-500">From<input className="block w-full min-w-0 h-11 border border-stone-200 rounded-xl px-3 mt-1.5 bg-stone-50 text-sm text-slate-700" type="date" required value={start} max={end} onChange={event => { setStart(event.target.value); setPreset(''); }} /></label>
          <label className="min-w-0 text-xs font-medium text-slate-500">To<input className="block w-full min-w-0 h-11 border border-stone-200 rounded-xl px-3 mt-1.5 bg-stone-50 text-sm text-slate-700" type="date" required value={end} min={start} max={localDate()} onChange={event => { setEnd(event.target.value); setPreset(''); }} /></label>
          <Button disabled={busy} type="submit" className="col-span-2 sm:col-span-1 h-11 rounded-xl bg-teal-700 hover:bg-teal-800"><FileBarChart className="w-4 h-4" />{busy ? 'Generating…' : 'Generate report'}</Button>
        </div>
      </form>
    </Card>
    {busy && <p role="status" className="text-sm text-teal-700">Preparing your report…</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {stale && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Dates changed. Generate the report again to update the results and exports.</p>}
    {!report && !busy && !error && <div className="text-center py-12 px-5 border border-dashed border-stone-200 rounded-2xl"><FileBarChart className="h-9 w-9 text-teal-300 mx-auto mb-4" /><h3 className="font-semibold text-slate-700">Your report starts here</h3><p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Choose a period to see check-ins, mood patterns, and follow-up activity in one place.</p></div>}
    {report && <>
      <section className="space-y-4" aria-label="Report results">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div><h3 className="text-lg font-semibold text-slate-800">{studentId ? 'Student summary' : 'Student overview'}</h3><p className="text-xs text-slate-500 mt-1">{report.start} – {report.end} · {rows.length} student{rows.length === 1 ? '' : 's'}</p></div>
          <div className="flex gap-2"><Button variant="outline" className="rounded-xl h-10 flex-1 sm:flex-none border-stone-200" disabled={!canExport} onClick={download}><Download className="w-4 h-4" />Download CSV</Button><Button variant="outline" className="rounded-xl h-10 flex-1 sm:flex-none border-stone-200" disabled={!canExport} onClick={printReport}><Printer className="w-4 h-4" />Print / Save PDF</Button></div>
        </div>
        <label className="block text-xs font-medium text-slate-500">Student<select aria-label="Student" className="block w-full sm:max-w-sm mt-1.5 h-11 border border-stone-200 rounded-xl px-3 bg-white text-sm text-slate-700" value={studentId} onChange={event => setStudentId(event.target.value)}><option value="">All students</option>{report.rows.map(row => <option key={row.id} value={row.id}>{row.name} · {row.id.slice(0,8)}</option>)}</select></label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[{label:'Check-ins',value:rows.reduce((sum,row)=>sum+row.checkIns,0),icon:ClipboardCheck,color:'text-teal-600 bg-teal-50'}, {label:'Struggling results',value:rows.reduce((sum,row)=>sum+row.struggling,0),icon:Heart,color:'text-rose-500 bg-rose-50'}, {label:'Follow-up notes',value:rows.reduce((sum,row)=>sum+row.followUps,0),icon:StickyNote,color:'text-sky-600 bg-sky-50'}, {label:'Reviews needed',value:rows.filter(row=>row.reviewNeeded).length,icon:Users,color:'text-amber-600 bg-amber-50'}].map(({label,value,icon:Icon,color}) => <Card key={label} className="p-4 sm:p-5 rounded-2xl border-stone-200/80 gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" /></span><strong className="text-3xl font-semibold text-slate-800 tabular-nums">{value}</strong><p className="text-xs text-slate-500">{label}</p></Card>)}
        </div>
      </section>
      {!rows.length ? <p className="text-sm text-slate-500 text-center py-8">No students available for this report.</p> : <>
        <div className="lg:hidden space-y-3">{rows.map(row => <article key={row.id} className="rounded-2xl border border-stone-200/80 bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-3"><button onClick={()=>setStudentId(row.id)} className="min-w-0 text-left font-semibold text-slate-800 hover:text-teal-700 break-words">{row.name}<ArrowUpRight className="inline h-4 w-4 ml-1 text-teal-600" /></button><ReviewStatus row={row} /></div>
          <dl className="grid grid-cols-3 gap-3"><div><dt className="text-xs text-slate-400">Check-ins</dt><dd className="text-lg font-semibold text-slate-700 mt-1">{row.checkIns}</dd></div><div><dt className="text-xs text-slate-400">Average score</dt><dd className="text-lg font-semibold text-teal-700 mt-1">{row.average === null ? '—' : `${row.average}%`}</dd></div><div><dt className="text-xs text-slate-400">Notes</dt><dd className="text-lg font-semibold text-slate-700 mt-1">{row.followUps}</dd></div></dl>
          <MoodBreakdown row={row} />
          <p className="border-t border-stone-100 pt-3 text-xs text-slate-500">{!row.lastCheckIn ? 'No check-in yet' : row.noNoteAfterLatest ? 'No note after latest check-in' : 'Note recorded after latest check-in'}</p>
        </article>)}</div>
        <div className="hidden lg:block overflow-x-auto rounded-2xl border border-stone-200/80 bg-white"><table className="w-full text-sm"><caption className="sr-only">Student check-ins and follow-up summary for the selected period</caption><thead className="bg-stone-50 text-xs text-slate-500"><tr>{['Student','Check-ins','Average score','Mood breakdown','Notes','Counselor review'].map(text=><th scope="col" key={text} className="text-left px-4 py-4 font-medium">{text}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t border-stone-100 hover:bg-stone-50/70"><td className="p-4"><button className="text-left font-medium text-slate-700 hover:text-teal-700" onClick={()=>setStudentId(row.id)}>{row.name}<ArrowUpRight className="inline w-3.5 h-3.5 ml-1 text-teal-600" /></button><p className="text-xs text-slate-400 mt-1 max-w-44">{!row.lastCheckIn ? 'No check-in yet' : row.noNoteAfterLatest ? 'No note after latest check-in' : 'Follow-up note recorded'}</p></td><td className="p-4 tabular-nums">{row.checkIns}</td><td className="p-4 font-semibold text-teal-700 tabular-nums">{row.average === null ? '—' : `${row.average}%`}</td><td className="p-4"><MoodBreakdown row={row} /></td><td className="p-4 tabular-nums">{row.followUps}</td><td className="p-4"><ReviewStatus row={row} /></td></tr>)}</tbody></table></div>
      </>}
      {studentId && <Card className="p-5 rounded-2xl border-stone-200/80 gap-4"><h3 className="font-semibold text-slate-700 flex items-center gap-2"><StickyNote className="h-4 w-4 text-teal-600" />Follow-up notes in this period</h3>{report.notes.filter(note=>note.student_id===studentId).sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(note=><div key={note.id} className="border-l-2 border-teal-200 pl-4"><time className="text-xs text-slate-400">{new Date(note.created_at).toLocaleString()}</time><p className="text-sm text-slate-600 whitespace-pre-wrap break-words mt-1">{note.note}</p></div>)}{!report.notes.some(note=>note.student_id===studentId) && <p className="text-sm text-slate-500">No notes in this period.</p>}</Card>}
      <footer className="space-y-3"><details className="text-xs text-slate-500"><summary className="cursor-pointer font-medium text-slate-600">How to read this report</summary><p className="mt-2 leading-relaxed max-w-2xl">Counts cover selected dates. Priority and review status are as of the end date. “Review needed” means no review is recorded or a newer check-in exists. A missing note does not prove no follow-up happened. Average scores reflect questionnaire points, not diagnoses. Appointment tracking is not included.</p></details><p className="text-xs text-slate-400">Generated {new Date(report.generated).toLocaleString()}</p></footer>
    </>}
  </div>;
}
