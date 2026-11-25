import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import RosterRow from './RosterRow';
import ManualMarkDialog from './ManualMarkDialog';

export default function RosterTabs({
  roster,
  loading,
  error,
  onRefresh,
  onMarkStudents,
  onUnmarkStudent,
  disabled,
}) {
  const [tab, setTab] = useState('all'); // 'all' | 'present' | 'absent'
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [dialogState, setDialogState] = useState({ open: false, mode: 'mark', studentIds: [], studentName: '' });

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchInput.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [searchInput]);

  const departments = useMemo(() => {
    const set = new Set();
    [...(roster.present || []), ...(roster.absent || [])].forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [roster]);

  const filterList = useCallback(
    (list) =>
      (list || []).filter((s) => {
        if (deptFilter && s.department !== deptFilter) return false;
        if (!debouncedQuery) return true;
        const hay = `${s.name || ''} ${s.rollNumber || ''} ${s.email || ''}`.toLowerCase();
        return hay.includes(debouncedQuery);
      }),
    [debouncedQuery, deptFilter]
  );

  const filteredPresent = useMemo(() => filterList(roster.present), [roster.present, filterList]);
  const filteredAbsent = useMemo(() => filterList(roster.absent), [roster.absent, filterList]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openMarkSingle = (student) => {
    setDialogState({
      open: true,
      mode: 'mark',
      studentIds: [student.id],
      studentName: student.name,
    });
  };

  const openMarkBulk = () => {
    if (selectedIds.length === 0) return;
    setDialogState({
      open: true,
      mode: 'mark',
      studentIds: selectedIds,
      studentName: '',
    });
  };

  const openUnmark = (student) => {
    setDialogState({
      open: true,
      mode: 'unmark',
      studentIds: [student.id],
      studentName: student.name,
    });
  };

  const handleConfirmDialog = async (reason) => {
    if (dialogState.mode === 'mark') {
      await onMarkStudents(dialogState.studentIds, reason);
      setSelectedIds([]);
    } else {
      await onUnmarkStudent(dialogState.studentIds[0], reason);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/80 p-4 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle size={28} className="mx-auto mb-2 text-red-600" />
        <p className="text-sm font-bold text-red-900">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const showPresent = tab === 'all' || tab === 'present';
  const showAbsent = tab === 'all' || tab === 'absent';
  const emptyFiltered =
    (showPresent ? filteredPresent.length : 0) + (showAbsent ? filteredAbsent.length : 0) === 0;

  return (
    <div className="space-y-4">
      {/* Tabs & Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === 'all' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({roster.summary.total})
          </button>
          <button
            type="button"
            onClick={() => setTab('present')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === 'present' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Present ({roster.summary.present})
          </button>
          <button
            type="button"
            onClick={() => setTab('absent')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === 'absent' ? 'bg-white text-amber-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Absent ({roster.summary.absent})
          </button>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or reg no..."
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {departments.length > 1 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Filter by department"
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-900 px-4 py-3 text-white shadow-md">
          <span className="text-xs font-bold">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold text-emerald-200 hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={openMarkBulk}
              disabled={disabled}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-400"
            >
              <UserCheck size={14} /> Mark selected present
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {emptyFiltered ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-bold text-gray-700">No students match this view.</p>
          <p className="mt-1 text-xs text-gray-500">
            Try clearing your search or switching tabs.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {showAbsent &&
            filteredAbsent.map((student) => (
              <RosterRow
                key={`absent-${student.id}`}
                student={student}
                isPresent={false}
                selected={selectedIds.includes(student.id)}
                onToggleSelect={toggleSelect}
                onMarkPresent={openMarkSingle}
                disabled={disabled}
              />
            ))}

          {showPresent &&
            filteredPresent.map((student) => (
              <RosterRow
                key={`present-${student.id}`}
                student={student}
                isPresent
                onMarkAbsent={openUnmark}
                disabled={disabled}
              />
            ))}
        </div>
      )}

      <ManualMarkDialog
        open={dialogState.open}
        mode={dialogState.mode}
        studentName={dialogState.studentName}
        count={dialogState.studentIds.length}
        onConfirm={handleConfirmDialog}
        onClose={() => setDialogState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
