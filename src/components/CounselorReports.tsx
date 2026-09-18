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
  return <div className="p-5 lg:p-8 max-w-6xl space-y-5">
    <h2 className="text-3xl font-medium text-slate-800">Counselor Reports</h2>
    <p className="text-sm text-slate-500">Summarize daily check-ins, recorded moods, follow-up notes, and counselor priority reviews. Appointment tracking is not available yet.</p>
    <Card className="p-5"><form onSubmit={generate} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Range<select className="block border rounded-lg p-2 mt-1" value={preset} onChange={(event) => { setPreset(event.target.value); if (event.target.value) { setStart(daysAgo(Number(event.target.value))); setEnd(localDate()); } }}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="">Custom dates</option></select></label>
      <label className="text-sm">From<input className="block border rounded-lg p-2 mt-1" type="date" required value={start} max={end} onChange={(event) => { setStart(event.target.value); setPreset(''); }} /></label>
      <label className="text-sm">To<input className="block border rounded-lg p-2 mt-1" type="date" required value={end} min={start} max={localDate()} onChange={(event) => { setEnd(event.target.value); setPreset(''); }} /></label>
      <Button disabled={busy} type="submit">{busy ? 'Generating…' : 'Generate report'}</Button>
    </form></Card>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {stale && <p role="status" className="text-sm text-amber-700">Dates changed. Generate the report again to update the results and exports.</p>}
    {report && <>
      <div className="flex flex-wrap gap-3 items-center"><label className="text-sm">Student <select aria-label="Student" className="border rounded-lg p-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">All students</option>{report.rows.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.id.slice(0, 8)}</option>)}</select></label><Button variant="outline" disabled={!canExport} onClick={download}>Download CSV</Button><Button variant="outline" disabled={!canExport} onClick={printReport}>Print / Save PDF</Button></div>
      <p className="text-xs text-slate-500">{report.start} – {report.end} · Generated {new Date(report.generated).toLocaleString()} · {rows.length} student{rows.length === 1 ? '' : 's'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Check-ins', rows.reduce((sum, row) => sum + row.checkIns, 0)], ['Struggling results', rows.reduce((sum, row) => sum + row.struggling, 0)], ['Follow-up notes', rows.reduce((sum, row) => sum + row.followUps, 0)], ['Reviews needed', rows.filter((row) => row.reviewNeeded).length]].map(([label, value]) => <Card key={label} className="p-4"><strong className="text-2xl text-teal-700">{value}</strong><p className="text-xs text-slate-500">{label}</p></Card>)}</div>
      <p className="text-xs text-slate-500">Counts cover selected dates. Priority and review status are as of the end date. “Review needed” means no review is recorded or a newer check-in exists. A missing note after a check-in does not prove that no follow-up happened. Results are not diagnoses.</p>
      {!rows.length ? <p className="text-sm text-slate-500">No students available for this report.</p> : <div className="overflow-x-auto bg-white rounded-xl border"><table className="w-full text-sm"><thead><tr>{['Student', 'Check-ins', 'Average', 'Moods: Happy / Okay / Struggling', 'Notes', 'Counselor review', 'Follow-up record'].map((text) => <th key={text} className="text-left p-3 whitespace-nowrap">{text}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-3"><button className="text-teal-700 underline" onClick={() => setStudentId(row.id)}>{row.name}</button></td><td className="p-3">{row.checkIns}</td><td className="p-3">{row.average === null ? '—' : `${row.average}%`}</td><td className="p-3">{row.happy} / {row.okay} / {row.struggling}</td><td className="p-3">{row.followUps}</td><td className="p-3">{row.priority}{row.reviewNeeded && <p className="text-xs text-amber-700">Review needed</p>}</td><td className="p-3 text-xs">{!row.lastCheckIn ? 'No check-in yet' : row.noNoteAfterLatest ? 'No note after latest check-in' : 'Note recorded after latest check-in'}</td></tr>)}</tbody></table></div>}
      {studentId && <Card className="p-5 space-y-3"><h3 className="font-semibold">Follow-up notes in this period</h3>{report.notes.filter((note) => note.student_id === studentId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((note) => <div key={note.id}><time className="text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</time><p className="text-sm whitespace-pre-wrap break-words">{note.note}</p></div>)}{!report.notes.some((note) => note.student_id === studentId) && <p className="text-sm text-slate-500">No notes in this period.</p>}</Card>}
    </>}
  </div>;
}
