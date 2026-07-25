"use client";

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Menu, X,  CalendarRange, Users, ListOrdered, Settings, Hourglass, Plus, BookOpen, Copy, ArrowLeft, ChevronRight, CheckCircle2, XOctagon, FileText, ChevronDown, CalendarPlus, LogOut, Lock, Clock, Download, Search } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

// ─── Roll Number Parser ───────────────────────────────────────────────────────
export function parseAmritaRollNumber(input: string | null | undefined) {
   if (!input) return { cleanRoll: '', dept: '', year: '', section: 'General', shortRoll: '', isValid: false };
   
   let clean = input.toUpperCase().trim();
   if (clean.includes('@')) clean = clean.split('@')[0];
   if (clean.startsWith('CB.SC.')) clean = clean.replace('CB.SC.', '');
   if (clean.startsWith('CBSC')) clean = clean.replace('CBSC', '');

   const match = clean.match(/^U4([A-Z]{3,4})(\d{2})(\d)(\d{2,3})$/);
   if (match) {
      const dept = match[1];
      const year = '20' + match[2];
      const secCode = match[3];
      const index = match[4];
      const secMap: Record<string, string> = { '0': 'A', '1': 'B', '2': 'C', '3': 'D' };
      const sectionName = secMap[secCode] ? `Section ${secMap[secCode]}` : `Sec ${secCode}`;
      
      return {
         cleanRoll: clean,
         dept,
         year,
         section: sectionName,
         shortRoll: `${secCode}${index}`,
         isValid: true
      };
   }

   return {
      cleanRoll: clean,
      dept: '',
      year: '',
      section: 'General',
      shortRoll: clean,
      isValid: false
   };
}

export default function ProfessorDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Navigation State
  const [viewState, setViewState] = useState<'PORTAL' | 'WORKSPACE'>('PORTAL');
  const [activeTab, setActiveTab] = useState('schedule');
  
  // Auth & Profile Data
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Course Data
  const [courses, setCourses] = useState<any[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  // Generator State
  const [genTargetProjectId, setGenTargetProjectId] = useState('NEW'); // 'NEW' or existing project ID
  const [genStartDate, setGenStartDate] = useState('');
  const [genEndDate, setGenEndDate] = useState('');
  const [genSelectedDays, setGenSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [genStart, setGenStart] = useState('09:00');
  const [genEnd, setGenEnd] = useState('16:00');
  const [genDuration, setGenDuration] = useState(45);
  const [genBreak, setGenBreak] = useState(15);
  const [genLunchStart, setGenLunchStart] = useState('12:00');
  const [genLunchEnd, setGenLunchEnd] = useState('13:00');
  const [genLoading, setGenLoading] = useState(false);
  const [missionReport, setMissionReport] = useState<{ lines: string[]; totalSlots: number; totalDays: number } | null>(null);

  // Form states
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseSection, setNewCourseSection] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseSection, setEditCourseSection] = useState('');
  const [updatingCourse, setUpdatingCourse] = useState(false);

  // Schedule Logic
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [activeScheduleDate, setActiveScheduleDate] = useState<string | null>(null);

  // Session Management Modal
  const [manageSlot, setManageSlot] = useState<any>(null);
  const [manageStatus, setManageStatus] = useState('BOOKED');
  const [manageGrade, setManageGrade] = useState('');
  const [manageMaxGrade, setManageMaxGrade] = useState('100');
  const [manageNotes, setManageNotes] = useState('');
  const [manageSaving, setManageSaving] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Group Manager State
  const [courseGroups, setCourseGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Student Directory State
  const [directoryStudents, setDirectoryStudents] = useState<any[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState('ALL');
  const [directorySort, setDirectorySort] = useState('NAME');

  // Custom Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string>('ALL');
  const filteredScheduleSlots = scheduleSlots.filter(s => filterProjectId === 'ALL' || s.project_id === filterProjectId);

  useEffect(() => {
     if (genStartDate && genEndDate) {
        const available = getAvailableDaysInRange(genStartDate, genEndDate);
        const weekdays = available.filter(d => d !== 0 && d !== 6);
        const defaultSelection = weekdays.length > 0 ? weekdays : available;
        setGenSelectedDays(defaultSelection);
     }
  }, [genStartDate, genEndDate]);

  useEffect(() => {
     if (!courses.length) return;

     // 1. Initial check
     const params = new URLSearchParams(window.location.search);
     const courseId = params.get('course');
     if (courseId && courses.some(c => c.id === courseId)) {
        enterWorkspace(courseId);
     }

     // 2. popstate listener
     const handlePopState = (event: PopStateEvent) => {
        const state = event.state;
        if (state && state.viewState === 'WORKSPACE' && state.courseId) {
           setActiveCourseId(state.courseId);
           setViewState('WORKSPACE');
           const active = courses.find(c => c.id === state.courseId);
           if (active) {
             setEditCourseName(active.name);
             setEditCourseSection(active.section);
           }
           loadWorkspacePulse(state.courseId);
        } else {
           setActiveCourseId(null);
           setViewState('PORTAL');
        }
     };

     window.addEventListener('popstate', handlePopState);
     return () => window.removeEventListener('popstate', handlePopState);
  }, [courses]);

  useEffect(() => {
     const filtered = scheduleSlots.filter(s => filterProjectId === 'ALL' || s.project_id === filterProjectId);
     if (filtered.length > 0) {
        const uniqueDates = Array.from(new Set(filtered.map(s => s.event_date))).sort();
        setActiveScheduleDate(prev => {
           if (prev && uniqueDates.includes(prev)) return prev;
           return uniqueDates[0] || null;
        });
     } else {
        setActiveScheduleDate(null);
     }
  }, [filterProjectId, scheduleSlots]);

  useEffect(() => {
    checkAuth();
  }, []);

  // 1. Data Loading on Context Entry / Realtime Refresh
  const loadWorkspacePulse = async (courseId: string) => {
    // Parallel fetch for speed
    await Promise.all([
      loadProjects(courseId),
      loadMasterSchedule(courseId),
      loadWaitlist(courseId),
      loadGroups(courseId),
      loadStudentDirectory(courseId)
    ]);
  };

  useEffect(() => {
    if (viewState === 'WORKSPACE' && activeCourseId) {
       loadWorkspacePulse(activeCourseId);
    }
  }, [viewState, activeCourseId]);

  // 2. Persistent WebSocket Subscriptions for Workspace
  useEffect(() => {
    if (viewState === 'WORKSPACE' && activeCourseId) {
       const channel = supabase.channel('realtime_workspace_prof')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => {
            // Re-load if we are on tabs that show slots
            loadMasterSchedule();
         })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist_entries' }, () => {
            // Re-load if we are on the waitlist tab
            loadWaitlist();
         })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
            // Re-load if we are on the groups tab
            loadGroups();
         })
         .subscribe();
       
       return () => { supabase.removeChannel(channel); };
    }
  }, [viewState, activeCourseId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }
    setUser(session.user);

    let { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();

    // Self-healing: if public profile is missing, call RPC function to create/repair it
    if (!userData) {
      const { error: repairError } = await supabase.rpc('create_my_profile');
      if (!repairError) {
        const { data: refetchedUser } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        userData = refetchedUser;
      }
    }

    if (userData?.role !== 'PROFESSOR') {
      router.push('/student');
      return;
    }
    setProfile(userData);

    await fetchCourses(session.user.id);
    setLoading(false);
  };

  const fetchCourses = async (userId: string) => {
    const { data } = await supabase.from('courses').select('*').eq('professor_id', userId).order('created_at', { ascending: false });
    if (data) setCourses(data);
  };

  const generateJoinCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newCourseName || !newCourseSection) return;

    const { data, error } = await supabase.from('courses').insert([{
      name: newCourseName,
      section: newCourseSection,
      professor_id: user.id,
      join_code: generateJoinCode()
    }]).select();

    if (!error && data) {
      setCourses([data[0], ...courses]);
      setNewCourseName('');
      setNewCourseSection('');
    } else {
      showToast("Error creating course: " + error?.message, "error");
    }
  };

  const enterWorkspace = async (courseId: string) => {
    setMobileMenuOpen(false);
    setActiveCourseId(courseId);
    const active = courses.find(c => c.id === courseId);
    if (active) {
      setEditCourseName(active.name);
      setEditCourseSection(active.section);
    }
    setViewState('WORKSPACE');
    setActiveTab('schedule');
    if (typeof window !== 'undefined' && window.location.search !== `?course=${courseId}`) {
      window.history.pushState({ viewState: 'WORKSPACE', courseId: courseId }, '', `?course=${courseId}`);
    }
    loadWorkspacePulse(courseId);
  };

  const exitWorkspace = () => {
    setMobileMenuOpen(false);
    setActiveCourseId(null);
    setViewState('PORTAL');
    setProjects([]);
    if (typeof window !== 'undefined' && window.location.search !== '') {
      window.history.pushState({ viewState: 'PORTAL' }, '', window.location.pathname);
    }
  };

  const handleCreateProject = async () => {
    if(!newProjectTitle || !activeCourseId) return;
    const { data, error } = await supabase.from('projects').insert([{
      course_id: activeCourseId,
      title: newProjectTitle,
      max_group_size: 5
    }]).select();
    if(data) setProjects([...projects, data[0]]);
    setNewProjectTitle('');
  };


  const loadProjects = async (forceId?: string) => {
    const cid = forceId || activeCourseId;
    if (!cid) return;
    const { data } = await supabase.from('projects').select('*').eq('course_id', cid).order('created_at', { ascending: true });
    if (data) setProjects(data);
  };

  const loadWaitlist = async (forceId?: string) => {
    const cid = forceId || activeCourseId;
    if (!cid) return;
    setWaitlistLoading(true);
    
    // Fetch project IDs fresh from DB
    const { data: projectRows } = await supabase
      .from('projects')
      .select('id')
      .eq('course_id', cid);

    const projectIds = (projectRows || []).map((p: any) => p.id);
    if (projectIds.length === 0) { setWaitlistEntries([]); setWaitlistLoading(false); return; }

    const { data: wlData } = await supabase.from('waitlist_entries')
      .select('id, created_at, group_id, groups(name), project_id, projects(title)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: true });

    if (wlData) setWaitlistEntries(wlData);
    setWaitlistLoading(false);
  };

  const loadGroups = async (forceId?: string) => {
    const cid = forceId || activeCourseId;
    if (!cid) return;
    setGroupsLoading(true);

    // Fetch groups with member details directly by course_id
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select(`
        id, name, created_at, course_id, leader_id,
        group_members(student_id, users!group_members_student_id_fkey(id, full_name))
      `)
      .eq('course_id', cid)
      .order('created_at', { ascending: false });

    if (groupsError) {
      // Fallback: simpler query without nested join if FK hint fails
      const { data: simpleGroups } = await supabase
        .from('groups')
        .select(`id, name, created_at, course_id, leader_id`)
        .eq('course_id', cid)
        .order('created_at', { ascending: false });

      if (simpleGroups) {
        const enriched = await Promise.all(simpleGroups.map(async (grp: any) => {
          const { data: members } = await supabase
            .from('group_members')
            .select('student_id, users(id, full_name)')
            .eq('group_id', grp.id);
          return { ...grp, group_members: members || [] };
        }));
        setCourseGroups(enriched);
      }
    } else {
      if (groupsData) setCourseGroups(groupsData);
    }

    setGroupsLoading(false);
  };

  const handleDeleteGroup = async (grp: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Group / Team",
      message: `Are you sure you want to permanently delete team "${grp.name}"? This will cancel their booked slots and remove all members.`,
      onConfirm: async () => {
        await supabase.from('slots').update({ status: 'AVAILABLE', group_id: null }).eq('group_id', grp.id);
        const { error } = await supabase.from('groups').delete().eq('id', grp.id);
        if (!error) {
          showToast(`Team "${grp.name}" has been deleted.`, "success");
          loadGroups();
        } else {
          showToast(`Error deleting team: ${error.message}`, "error");
        }
        setConfirmModal(null);
      }
    });
  };

  const loadStudentDirectory = async (forceId?: string) => {
    const cid = forceId || activeCourseId;
    if (!cid) return;
    setDirectoryLoading(true);
    const { data: enrollData } = await supabase
       .from('course_enrollments')
       .select('joined_at, student_id, users(id, full_name, email, roll_number)')
       .eq('course_id', cid);

    if (!enrollData) {
       setDirectoryStudents([]);
       setDirectoryLoading(false);
       return;
    }

    const { data: groupsData } = await supabase
       .from('groups')
       .select('id, name, group_members(student_id)')
       .eq('course_id', cid);

    const groupMap = new Map<string, string>();
    if (groupsData) {
       groupsData.forEach((g: any) => {
          g.group_members?.forEach((m: any) => {
             groupMap.set(m.student_id, g.name);
          });
       });
    }

    const list = enrollData.map((item: any) => {
       const u = item.users;
       const parsed = parseAmritaRollNumber(u?.roll_number);
       return {
          id: u?.id || item.student_id,
          full_name: u?.full_name || 'Unknown Student',
          email: u?.email || 'N/A',
          roll_number: u?.roll_number || 'N/A',
          parsedRoll: parsed,
          teamName: groupMap.get(item.student_id) || null,
          joined_at: item.joined_at
       };
    });

    setDirectoryStudents(list);
    setDirectoryLoading(false);
  };

  const downloadStudentDirectoryCSV = () => {
     if (!directoryStudents.length) {
        showToast("No student records to export", "error");
        return;
     }
     const headers = ["Student Name", "Section", "Roll Number", "Assigned Team", "Email Address", "Joined Date"];
     const rows = directoryStudents.map(s => [
        `"${(s.full_name || '').replace(/"/g, '""')}"`,
        `"${s.parsedRoll.section}"`,
        `"${s.roll_number || 'N/A'}"`,
        `"${s.teamName || 'No Team'}"`,
        `"${s.email}"`,
        `"${new Date(s.joined_at).toLocaleString()}"`
     ]);
     const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.setAttribute("href", url);
     link.setAttribute("download", `Student_Directory_${activeCourse?.name || 'Course'}.csv`);
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     showToast("Student directory exported to CSV", "success");
  };

  const handleDeleteProject = async (projectId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanent Deletion",
      message: "Are you sure you want to delete this assignment? All generated slots, waitlists, and student bookings will be wiped.",
      onConfirm: async () => {
        const { error } = await supabase.from('projects').delete().eq('id', projectId);
        if (!error) {
           setProjects(projects.filter(p => p.id !== projectId));
           setScheduleSlots([]);
           showToast("Assignment wiped from system.", "success");
        } else {
           showToast("Error: " + error.message, "error");
        }
        setConfirmModal(null);
      }
    });
  };

  const loadMasterSchedule = async (forceId?: string) => {
    const cid = forceId || activeCourseId;
    if (!cid) return;
    setScheduleLoading(true);
    
    // Fetch project IDs fresh from DB
    const { data: projectRows } = await supabase
      .from('projects')
      .select('id')
      .eq('course_id', cid);

    const projectIds = (projectRows || []).map((p: any) => p.id);
    if (projectIds.length === 0) { setScheduleSlots([]); setScheduleLoading(false); return; }

    const { data: events } = await supabase.from('events').select('id, title, date, project_id').in('project_id', projectIds);
    if (!events || events.length === 0) { setScheduleSlots([]); setScheduleLoading(false); return; }

    const eventIds = events.map(e => e.id);
    
    // Fetch Slots and carefully nest the related Group names
    const { data: slots } = await supabase.from('slots')
      .select(`id, start_time, end_time, status, grade, private_notes, event_id, group_id, groups(name)`)
      .in('event_id', eventIds)
      .order('start_time', { ascending: true });

    if (slots) {
       const enriched = slots.map(s => {
          const ev = events.find(e => e.id === s.event_id);
          return { ...s, event_title: ev?.title, event_date: ev?.date, project_id: ev?.project_id };
       });
       // Sort by date then time
       enriched.sort((a,b) => {
          if (a.event_date !== b.event_date) return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
          return a.start_time.localeCompare(b.start_time);
       });
        setScheduleSlots(enriched);
        if (enriched.length > 0) {
           const uniqueDates = Array.from(new Set(enriched.map(s => s.event_date))).sort();
           setActiveScheduleDate(prev => {
              if (prev && uniqueDates.includes(prev)) return prev;
              return uniqueDates[0] || null;
           });
        } else {
           setActiveScheduleDate(null);
        }
    }
    setScheduleLoading(false);
  };

  const openManageModal = (slot: any) => {
     setManageSlot(slot);
     setManageStatus(slot.status);
     setManageNotes(slot.private_notes || '');
     
     if (slot.grade && typeof slot.grade === 'string' && slot.grade.includes('/')) {
        const [sc, mx] = slot.grade.split('/');
        setManageGrade(sc);
        setManageMaxGrade(mx);
     } else {
        setManageGrade(slot.grade?.toString() || '');
        setManageMaxGrade('100');
     }
  };

  const saveSlotDetails = async () => {
     if (!manageSlot) return;
     setManageSaving(true);
     
     const updatePayload = {
        status: manageStatus,
        grade: manageGrade ? `${manageGrade}/${manageMaxGrade}` : null,
        private_notes: manageNotes
     };

     // If cancelling the booking, strip the group
     if (manageStatus === 'AVAILABLE') {
       (updatePayload as any).group_id = null;
     }

     const { error } = await supabase.from('slots').update(updatePayload).eq('id', manageSlot.id);
     
     if (!error) {
       setManageSlot(null);
       showToast("Record updated successfully", "success");
       loadMasterSchedule(); // refresh UI seamlessly
    } else {
       showToast(error.message, "error");
    }
    setManageSaving(false);
  };

  const downloadGradeRegistryCSV = () => {
     if (filteredScheduleSlots.length === 0) {
        showToast("No data to export", "error");
        return;
     }

     const finalRecords = scheduleSlots.filter(s => s.status === 'PRESENTED' || s.status === 'ABSENT');
     if (finalRecords.length === 0) {
        showToast("No finalized grades found", "info");
        return;
     }

     const headers = ["Group Name", "Status", "Grade", "Notes", "Timestamp"];
     const rows = finalRecords.map(s => [
        s.groups?.name || "Unknown",
        s.status,
        s.grade || "N/A",
        `"${(s.private_notes || "").replace(/"/g, '""')}"`,
        new Date(s.updated_at || s.created_at).toLocaleString()
     ]);

     const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.setAttribute("href", url);
     link.setAttribute("download", `Grades_${activeCourse?.name || 'AmSlot'}.csv`);
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
      showToast("Grade Registry exported to CSV", "success");
   };

   const handleUpdateCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeCourseId || !editCourseName || !editCourseSection) return;
      setUpdatingCourse(true);

      const { error } = await supabase
         .from('courses')
         .update({
            name: editCourseName,
            section: editCourseSection
         })
         .eq('id', activeCourseId);

      if (!error) {
         setCourses(courses.map(c => c.id === activeCourseId ? { ...c, name: editCourseName, section: editCourseSection } : c));
         showToast("Workspace details updated successfully.", "success");
      } else {
         showToast("Error updating workspace: " + error.message, "error");
      }
      setUpdatingCourse(false);
   };

   const handleDeleteCourse = () => {
      if (!activeCourseId || !activeCourse) return;
      setConfirmModal({
         isOpen: true,
         title: "Permanent Workspace Deletion",
         message: `Are you sure you want to delete "${activeCourse.name}"? This will permanently wipe all assignments, slots, waitlists, student enrollments, and grades associated with this course.`,
         onConfirm: async () => {
            const { error } = await supabase
               .from('courses')
               .delete()
               .eq('id', activeCourseId);

            if (!error) {
               showToast("Workspace wiped from system.", "success");
               setCourses(courses.filter(c => c.id !== activeCourseId));
               exitWorkspace();
            } else {
               showToast("Error deleting workspace: " + error.message, "error");
            }
            setConfirmModal(null);
         }
      });
   };

  const handlePromoteFromWaitlist = async (entry: any) => {
    // 1. Find an available slot for this project
    const { data: availableSlots } = await supabase
      .from('slots')
      .select('id, event_id')
      .eq('status', 'AVAILABLE')
      .in('event_id', (await supabase.from('events').select('id').eq('project_id', entry.project_id)).data?.map(e => e.id) || []);

    if (!availableSlots || availableSlots.length === 0) {
      showToast("No available slots to promote this group into.", "error");
      return;
    }

    const targetSlotId = availableSlots[0].id;

    // 2. Book the slot
    const { error: rpcError } = await supabase.rpc('book_slot', {
      p_slot_id: targetSlotId,
      p_group_id: entry.group_id
    });

    if (rpcError) {
      showToast("Promotion failed: " + rpcError.message, "error");
      return;
    }

    // 3. Remove waitlist entry
    await supabase.from('waitlist_entries').delete().eq('id', entry.id);

    showToast(`Success! ${entry.groups.name} promoted.`, "success");
    loadWaitlist();
    loadMasterSchedule();
  };

  // --- SKELETON COMPONENTS ---
    const getAvailableDaysInRange = (startStr: string, endStr: string) => {
     if (!startStr || !endStr) return [0, 1, 2, 3, 4, 5, 6];
     const start = new Date(startStr + 'T12:00:00');
     const end = new Date(endStr + 'T12:00:00');
     if (start > end) return [];
     
     const days = new Set<number>();
     let current = new Date(start);
     let safety = 0;
     while (current <= end && safety < 100) {
        days.add(current.getDay());
        current.setDate(current.getDate() + 1);
        safety++;
     }
     return Array.from(days);
  };

const CourseSkeleton = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: '240px', borderRadius: '24px' }} />
      ))}
    </div>
  );

  const TableSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="skeleton" style={{ height: '50px', width: '100%', borderRadius: '12px' }} />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '16px' }} />
      ))}
    </div>
  );

  const GeneratorSkeleton = () => (
    <div className="glass-panel" style={{ padding: '2.5rem' }}>
       <div className="skeleton" style={{ height: '30px', width: '200px', marginBottom: '2rem' }} />
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '10px' }} />)}
       </div>
    </div>
  );

  if (loading) {
    return (
      <div className="app-container">
         {/* Mobile Header Bar */}
         <div className="mobile-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <div className="creative-logo" style={{ width: '28px', height: '28px' }}>
                  <div className="ring ring-1" style={{ borderTopColor: 'var(--primary)' }}></div>
                  <div className="logo-core" style={{ borderRadius: '5px' }}><Hourglass size={9} color="#fff" /></div>
               </div>
               <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>Am<span className="text-gradient">Slot</span></span>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-btn">
               {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
         </div>

         {/* Mobile Backdrop overlay */}
         <div className={`mobile-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <div className="fluid-blob blob-1" style={{ opacity: 0.1, top: '10%', right: '10%', pointerEvents: 'none' }}></div>
         <aside className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`} style={{ width: '280px' }}>
            <div className="skeleton" style={{ height: '40px', width: '150px', marginBottom: '3rem' }} />
         </aside>
         <main className="main-content">
            <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: '20px', width: '500px', marginBottom: '4rem' }} />
            <CourseSkeleton />
         </main>
      </div>
    );
  }

  const activeCourse = courses.find(c => c.id === activeCourseId);

    return (
      <div className="app-container">
         {/* Mobile Header Bar */}
         <div className="mobile-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <div className="creative-logo" style={{ width: '28px', height: '28px' }}>
                  <div className="ring ring-1" style={{ borderTopColor: 'var(--primary)' }}></div>
                  <div className="logo-core" style={{ borderRadius: '5px' }}><Hourglass size={9} color="#fff" /></div>
               </div>
               <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>Am<span className="text-gradient">Slot</span></span>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-btn">
               {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
         </div>

         {/* Mobile Backdrop overlay */}
         <div className={`mobile-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <div className="fluid-blob blob-1" style={{ opacity: 0.1, top: '10%', right: '10%', pointerEvents: 'none' }}></div>
      
      {/* =========================================================
          SIDEBAR NAVIGATION (Dynamic based on ViewState)
          ========================================================= */}
      <aside className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`} style={{ width: viewState === 'PORTAL' ? '280px' : '300px' }}>
        
        {/* Universal Brand Header */}
        <div style={{ marginBottom: viewState === 'PORTAL' ? '4rem' : '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div className="creative-logo" style={{ width: '32px', height: '32px' }}>
              <div className="ring ring-1" style={{ borderTopColor: 'var(--primary)' }}></div>
              <div className="logo-core" style={{ borderRadius: '6px' }}><Hourglass size={10} color="#fff" /></div>
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-outfit)'}}>Am<span className="text-gradient">Slot</span></span>
          </div>
          
          {/* Professor Identity */}
          {viewState === 'PORTAL' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>
                 {profile?.full_name?.substring(0,2).toUpperCase() || 'PR'}
               </div>
               <div>
                 <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{profile?.full_name || 'Professor'}</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                   <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }}></div>
                   <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faculty Admin</span>
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* PORTAL NAVIGATION */}
        {viewState === 'PORTAL' && (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="tab-btn active" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1rem', textAlign: 'left' }}>
              <LayoutDashboard size={20} /> Overview
            </button>
            <button className="tab-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', textAlign: 'left', cursor: 'pointer' }}>
              <Settings size={20} /> Account Settings
            </button>
          </nav>
        )}

        {/* WORKSPACE NAVIGATION */}
        {viewState === 'WORKSPACE' && (
          <div className="animate-fade-in-up">
            <button onClick={exitWorkspace} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid var(--card-border)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem', transition: 'all 0.2s' }}>
              <ArrowLeft size={16} /> Back to Courses
            </button>

            <div style={{ padding: '1.25rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Active Workspace</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{activeCourse?.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>{activeCourse?.section}</div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={() => setActiveTab('schedule')} className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: activeTab === 'schedule' ? 'var(--primary)' : 'transparent', color: activeTab === 'schedule' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s', textAlign: 'left' }}>
                <LayoutDashboard size={20} /> Master Schedule
              </button>
              <button onClick={() => setActiveTab('generator')} className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: activeTab === 'generator' ? 'var(--primary)' : 'transparent', color: activeTab === 'generator' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s', textAlign: 'left' }}>
                <CalendarRange size={20} /> Slot Generator
              </button>
              <button onClick={() => setActiveTab('waitlist')} className={`tab-btn ${activeTab === 'waitlist' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: activeTab === 'waitlist' ? 'var(--primary)' : 'transparent', color: activeTab === 'waitlist' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><ListOrdered size={20} /> Waitlist Queue</div>
              </button>
              <button onClick={() => setActiveTab('groups')} className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: activeTab === 'groups' ? 'var(--primary)' : 'transparent', color: activeTab === 'groups' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s', textAlign: 'left' }}>
                <Users size={20} /> Group Manager
              </button>
              <button onClick={() => { setActiveTab('directory'); if (activeCourseId) loadStudentDirectory(activeCourseId); }} className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: activeTab === 'directory' ? 'var(--primary)' : 'transparent', color: activeTab === 'directory' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s', textAlign: 'left' }}>
                <BookOpen size={20} /> Student List
              </button>
              <button onClick={() => setActiveTab('gradebook')} className={`tab-btn ${activeTab === 'gradebook' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: activeTab === 'gradebook' ? 'var(--primary)' : 'transparent', color: activeTab === 'gradebook' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s', textAlign: 'left', marginTop: '1rem' }}>
                <FileText size={20} /> Grade Registry
              </button>
              <button onClick={() => setActiveTab('settings')} className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', cursor: 'pointer', background: activeTab === 'settings' ? 'var(--primary)' : 'transparent', color: activeTab === 'settings' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s', textAlign: 'left' }}>
                <Settings size={20} /> Workspace Settings
              </button>
            </nav>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
             <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT AREA
          ========================================================= */}
         <main className="main-content">

         {/* ---------------- LEVEL 1: PORTAL ---------------- */}
         {viewState === 'PORTAL' && (
           <div className="animate-fade-in-up">
              <header style={{ marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>My Workspaces</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', maxWidth: '600px', fontSize: '1.1rem' }}>Select a course to manage its schedule, or create a new environment.</p>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                 <div style={{ padding: '2.5rem 2rem', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.03)', border: '2px dashed rgba(139, 92, 246, 0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }}>
                    <form onSubmit={handleCreateCourse} style={{ width: '100%', textAlign: 'center' }}>
                       <div style={{ background: 'rgba(139, 92, 246, 0.15)', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)' }}>
                          <Plus size={28} />
                       </div>
                       <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>New Course</h3>
                       <input type="text" placeholder="Course Name (e.g. AI)" value={newCourseName} onChange={e=>setNewCourseName(e.target.value)} required style={{ width: '100%', padding: '0.875rem', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} />
                       <input type="text" placeholder="Section (e.g. Batch A)" value={newCourseSection} onChange={e=>setNewCourseSection(e.target.value)} required style={{ width: '100%', padding: '0.875rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} />
                       <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }}>Create Workspace</button>
                    </form>
                 </div>

                 {courses.map(course => (
                   <div 
                     key={course.id} onClick={() => enterWorkspace(course.id)}
                     style={{ padding: '2.5rem 2rem', borderRadius: '20px', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid var(--card-border)', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column' }}
                     onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
                   >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'auto' }}>
                         <div>
                           <div className="badge" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>{course.section}</div>
                           <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#fff' }}>{course.name}</h3>
                         </div>
                         <div style={{ color: 'rgba(255,255,255,0.2)' }}><ChevronRight size={24} /></div>
                      </div>
                      
                      <div style={{ marginTop: '3rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                         <div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Invite Code</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.1em', color: '#34d399' }}>{course.join_code}</div>
                         </div>
                         <button onClick={() => navigator.clipboard.writeText(course.join_code)} title="Copy Code" style={{ background: 'rgba(52, 211, 153, 0.1)', border: 'none', padding: '0.75rem', borderRadius: '8px', color: '#34d399', cursor: 'pointer' }}><Copy size={16} /></button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         )}
         
         {/* ---------------- LEVEL 2: WORKSPACE ---------------- */}
         {viewState === 'WORKSPACE' && activeCourse && (
            <div className="animate-fade-in-up">
               
               {/* Executive Breadcrumbs */}
               <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                  <LayoutDashboard size={14} /> 
                  <span 
                     onClick={exitWorkspace} 
                     style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
                     onMouseOver={e => e.currentTarget.style.color = '#fff'} 
                     onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                  >Workspaces</span>
                  <ChevronRight size={14} />
                  <span 
                     onClick={() => setActiveTab('schedule')} 
                     style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
                     onMouseOver={e => e.currentTarget.style.color = '#fff'} 
                     onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                  >{activeCourse.name}</span>
                  <ChevronRight size={14} />
                  <span style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>{activeTab}</span>
               </div>

               {/* Executive Metrics Row */}
               <div className="metrics-grid">
                  <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                     <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Enrolled</div>
                     <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff' }}>{courseGroups.reduce((acc, g) => acc + (g.group_members?.length || 0), 0)} <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)' }}>Students</span></div>
                  </div>
                  <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                     <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Slot Utilization</div>
                     <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>
                       {scheduleSlots.length > 0 ? Math.round((scheduleSlots.filter(s => s.groups).length / scheduleSlots.length) * 100) : 0}%
                     </div>
                  </div>
                  <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                     <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Waitlist Depth</div>
                     <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f43f5e' }}>{waitlistEntries.length} <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)' }}>Groups</span></div>
                  </div>
                  <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                     <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Graded Sessions</div>
                     <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#34d399' }}>{scheduleSlots.filter(s => s.status === 'PRESENTED' || s.status === 'ABSENT').length}</div>
                  </div>
               </div>

               {activeTab === 'schedule' && (
                 <div>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', gap: '2rem', flexWrap: 'wrap' }}>
                      <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Review Timeline</h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', maxWidth: '600px' }}>Your central overview covering all slots inside this active workspace.</p>
                      </div>
                      
                      {/* Assignment Filter Selector Dropdown */}
                      {projects.length > 0 && (
                         <div style={{ position: 'relative', minWidth: '220px' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                               <BookOpen size={16} />
                            </div>
                            <select 
                               value={filterProjectId} 
                               onChange={(e) => setFilterProjectId(e.target.value)}
                               style={{ 
                                  width: '100%',
                                  padding: '0.875rem 2.5rem 0.875rem 2.5rem', 
                                  background: 'rgba(255,255,255,0.03)', 
                                  border: '1px solid rgba(255,255,255,0.08)', 
                                  borderRadius: '14px', 
                                  color: '#fff', 
                                  outline: 'none', 
                                  fontWeight: 700, 
                                  fontSize: '0.9rem', 
                                  cursor: 'pointer',
                                  appearance: 'none',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                               }}
                            >
                               <option value="ALL" style={{ background: '#120d1d', color: '#fff' }}>All Assignments</option>
                               {projects.map(p => (
                                  <option key={p.id} value={p.id} style={{ background: '#120d1d', color: '#fff' }}>{p.title}</option>
                               ))}
                            </select>
                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>
                               <ChevronDown size={16} />
                            </div>
                         </div>
                      )}
                    </header>

                    {scheduleLoading ? (
                        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                           <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: 'none' }}>
                              <colgroup>
                                 <col style={{ width: '25%' }} />
                                 <col style={{ width: '30%' }} />
                                 <col style={{ width: '25%' }} />
                                 <col style={{ width: '20%' }} />
                              </colgroup>
                              <thead>
                                 <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--card-border)' }}>
                                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Time Slot</th>
                                    <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Booked Group</th>
                                    <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Status</th>
                                    <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Actions</th>
                                 </tr>
                              </thead>
                           </table>
                           <TableSkeleton />
                        </div>
                    ) : filteredScheduleSlots.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                           <div className="empty-state" style={{ padding: '4rem', textAlign: 'center' }}>
                              <div className="empty-state-icon" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarRange size={32} /></div>
                              <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{filterProjectId === 'ALL' ? 'Timeline is Empty' : 'No Slots for this Assignment'}</h3>
                              <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '350px', margin: '0 auto' }}>{filterProjectId === 'ALL' ? 'Use the Slot Generator to mass-generate presentation blocks.' : 'Select another filter or generate slots for this assignment in the Slot Generator tab.'}</p>
                           </div>
                        </div>
                     ) : (
(() => {
                           const uniqueDates = Array.from(new Set(filteredScheduleSlots.map(s => s.event_date))).sort();
                           return (
                              <div className="two-col-grid">
                                 
                                 <div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.5rem' }}>Select Date</div>
                                    <div className="date-strip">
                                    {uniqueDates.map(dateStr => {
                                       const d = new Date(dateStr + 'T00:00:00');
                                       const isActive = activeScheduleDate === dateStr;
                                       const slotsOnDay = filteredScheduleSlots.filter(s => s.event_date === dateStr);
                                       const bookedCount = slotsOnDay.filter(s => s.status === 'BOOKED' || s.status === 'PRESENTED').length;
                                       const totalCount = slotsOnDay.length;
                                       
                                       return (
                                          <button key={dateStr} onClick={() => setActiveScheduleDate(dateStr)}
                                             style={{
                                                padding: '1rem',
                                                borderRadius: '16px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                                background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${isActive ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
                                                boxShadow: isActive ? '0 12px 30px rgba(139,92,246,0.3)' : 'none',
                                                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.15rem'
                                             }}
                                          >
                                             <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
                                                {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                             </div>
                                             <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-outfit)' }}>
                                                {d.getDate()}
                                             </div>
                                             <div style={{ fontSize: '0.65rem', color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', marginBottom: '0.25rem' }}>
                                                {d.toLocaleDateString('en-US', { month: 'short' })}
                                             </div>
                                             <div style={{
                                                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.1)',
                                                borderRadius: '6px',
                                                padding: '0.2rem 0.4rem',
                                                fontSize: '0.65rem',
                                                color: isActive ? '#fff' : 'var(--primary)',
                                                fontWeight: 800,
                                                whiteSpace: 'nowrap'
                                             }}>
                                                {bookedCount}/{totalCount} booked
                                             </div>
                                          </button>
                                       );
                                    })}
                                    </div>
                                 </div>

                                 {/* Slots Table Column */}
                                 <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', flex: 1, margin: 0 }}>
                                    {filteredScheduleSlots.filter(s => s.event_date === activeScheduleDate).length === 0 ? (
                                       <>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: 'none' }}>
                                             <colgroup>
                                                <col style={{ width: '25%' }} />
                                                <col style={{ width: '30%' }} />
                                                <col style={{ width: '25%' }} />
                                                <col style={{ width: '20%' }} />
                                             </colgroup>
                                             <thead>
                                                <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--card-border)' }}>
                                                   <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Time Slot</th>
                                                   <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Booked Group</th>
                                                   <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Status</th>
                                                   <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Actions</th>
                                                </tr>
                                             </thead>
                                          </table>
                                          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                                             No slots scheduled for this date.
                                          </div>
                                       </>
                                    ) : (
                                       <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: 'none' }}>
                                          <colgroup>
                                             <col style={{ width: '25%' }} />
                                             <col style={{ width: '30%' }} />
                                             <col style={{ width: '25%' }} />
                                             <col style={{ width: '20%' }} />
                                          </colgroup>
                                          <thead>
                                             <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--card-border)' }}>
                                                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Time Slot</th>
                                                <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Booked Group</th>
                                                <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Status</th>
                                                <th style={{ padding: '1.25rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: 'none' }}>Actions</th>
                                             </tr>
                                          </thead>
                                          <tbody>
                                             {filteredScheduleSlots.filter(s => s.event_date === activeScheduleDate).map((slot) => {
                                                const start = slot.start_time.substring(0,5);
                                                const end = slot.end_time.substring(0,5);
                                                const hasGroup = slot.groups !== null;

                                                return (
                                                   <tr key={slot.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                                      <td style={{ padding: '1.5rem 2rem', textAlign: 'left', verticalAlign: 'middle', border: 'none' }}>
                                                         <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{start} - {end}</div>
                                                         <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.15rem' }}>{slot.event_title}</div>
                                                      </td>
                                                      <td style={{ padding: '1.5rem 2rem', textAlign: 'center', verticalAlign: 'middle', border: 'none' }}>
                                                         {hasGroup ? (
                                                            <div style={{ fontWeight: 700, color: '#fff' }}>{slot.groups.name}</div>
                                                         ) : (
                                                            <span style={{ padding: '0.4rem 0.75rem', background: 'rgba(52, 211, 153, 0.05)', color: '#34d399', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', border: '1px solid rgba(52, 211, 153, 0.15)' }}>AVAILABLE</span>
                                                         )}
                                                      </td>
                                                      <td style={{ padding: '1.5rem 2rem', textAlign: 'center', verticalAlign: 'middle', border: 'none' }}>
                                                         {slot.status === 'AVAILABLE' && <span className="badge" style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Unbooked</span>}
                                                         {slot.status === 'BOOKED' && <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--primary)', margin: 0 }}>Scheduled</span>}
                                                         {slot.status === 'PRESENTED' && <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', margin: 0 }}>Presented</span>}
                                                      </td>
                                                      <td style={{ padding: '1.5rem 2rem', textAlign: 'center', verticalAlign: 'middle', border: 'none' }}>
                                                         <button onClick={() => openManageModal(slot)} className="btn btn-secondary" disabled={!hasGroup} style={{ opacity: hasGroup ? 1 : 0.4 }}>Manage</button>
                                                      </td>
                                                   </tr>
                                                );
                                             })}
                                          </tbody>
                                       </table>
                                    )}
                                 </div>
                              </div>
                           );
                        })()
                     )}
                 </div>
               )}

               {activeTab === 'generator' && (
                 <div className="animate-fade-in-up">
                    <header style={{ marginBottom: '2.5rem' }}>
                      <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.4))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Control Centre</h1>
                      <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '1rem' }}>Configure and execute high-density slot generation for your assignments.</p>
                    </header>

                    {genLoading ? <GeneratorSkeleton /> : (
                      <div className="booking-panel-grid">
                       
                       {/* ━━━ LEFT COLUMN: Config ━━━ */}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                          {/* 1. Assignment Target */}
                          <div className="glass-panel" style={{ margin: 0, position: 'relative', overflow: 'hidden', padding: '1.75rem' }}>
                             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--primary), #a78bfa, transparent)' }} />
                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>01 — Assignment Target</span>
                                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                   <button onClick={() => setGenTargetProjectId('NEW')} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: genTargetProjectId === 'NEW' ? 'var(--primary)' : 'transparent', color: genTargetProjectId === 'NEW' ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>New</button>
                                   <button onClick={() => { if (projects.length > 0) setGenTargetProjectId(projects[0].id); else showToast("No existing assignments.", "info"); }} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: genTargetProjectId !== 'NEW' ? 'var(--primary)' : 'transparent', color: genTargetProjectId !== 'NEW' ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>Existing</button>
                                </div>
                             </div>
                             {genTargetProjectId === 'NEW' ? (
                                <input type="text" placeholder="Assignment name — e.g. Update 2 Review" value={newProjectTitle} onChange={e=>setNewProjectTitle(e.target.value)} style={{ width: '100%', padding: '0.875rem 1.25rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e=>e.currentTarget.style.borderColor='rgba(139,92,246,0.6)'} onBlur={e=>e.currentTarget.style.borderColor='rgba(139,92,246,0.2)'} />
                             ) : (
                                <select value={genTargetProjectId} onChange={e => setGenTargetProjectId(e.target.value)} style={{ width: '100%', padding: '0.875rem 1.25rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', cursor: 'pointer' }}>
                                   {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                             )}
                          </div>

                          {/* 2. Date Range */}
                          <div className="glass-panel" style={{ margin: 0, padding: '1.75rem' }}>
                             <span style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: '1.25rem' }}>02 — Operational Window</span>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.5rem' }}>Start Date</label>
                                  <input type="date" value={genStartDate} min={new Date().toISOString().split('T')[0]} onChange={e=>setGenStartDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.5rem' }}>End Date</label>
                                  <input type="date" value={genEndDate} min={genStartDate || new Date().toISOString().split('T')[0]} onChange={e=>setGenEndDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                                </div>
                             </div>

                             <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: '0.75rem' }}>Active Days</label>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                 {['S','M','T','W','T','F','S'].map((day, idx) => {
                                    const fullDay = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][idx];
                                    const isAvailable = getAvailableDaysInRange(genStartDate, genEndDate).includes(idx);
                                    const isSelected = isAvailable && genSelectedDays.includes(idx);
                                    const isWeekend = idx === 0 || idx === 6;
                                    return (
                                       <button 
                                          key={idx} 
                                          disabled={!isAvailable}
                                          type="button"
                                          onClick={() => { 
                                             if (isSelected) {
                                                setGenSelectedDays(genSelectedDays.filter(d=>d!==idx));
                                             } else {
                                                setGenSelectedDays([...genSelectedDays, idx]);
                                             }
                                          }} 
                                          title={isAvailable ? fullDay : `${fullDay} (Not in selected date range)`}
                                          style={{ 
                                             flex: 1, 
                                             aspectRatio: '1', 
                                             borderRadius: '10px', 
                                             border: isAvailable ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                             background: isSelected ? (isWeekend ? 'rgba(244,63,94,0.7)' : 'var(--primary)') : 'rgba(0,0,0,0.2)', 
                                             color: isSelected ? '#fff' : (isAvailable ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'), 
                                             fontWeight: 900, 
                                             cursor: isAvailable ? 'pointer' : 'not-allowed', 
                                             transition: 'all 0.15s', 
                                             fontSize: '0.8rem', 
                                             boxShadow: isSelected ? (isWeekend ? '0 4px 12px rgba(244,63,94,0.3)' : '0 4px 12px rgba(139,92,246,0.3)') : 'none', 
                                             transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                             opacity: isAvailable ? 1 : 0.25
                                          }}
                                       >
                                          {day}
                                       </button>
                                    );
                                 })}
                              </div>
                          </div>

                          {/* 3. Day Timeline Visualizer — THE STAR FEATURE */}
                          <div className="glass-panel" style={{ margin: 0, padding: '1.75rem' }}>
                             <span style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: '1.5rem' }}>03 — Day Architecture</span>

                             {/* Visual Timeline Bar — shows the day as a horizontal track */}
                             {(() => {
                                const MIN_HOUR = 6, MAX_HOUR = 22; // 6am–10pm span
                                const totalSpan = (MAX_HOUR - MIN_HOUR) * 60;
                                const timeToMins = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
                                const startMins = genStart ? timeToMins(genStart) : 0;
                                const endMins   = genEnd   ? timeToMins(genEnd)   : 0;
                                const lunchSMins = genLunchStart ? timeToMins(genLunchStart) : 0;
                                const lunchEMins = genLunchEnd   ? timeToMins(genLunchEnd)   : 0;
                                const clamp = (v: number) => Math.max(0, Math.min(100, v));
                                const toPercent = (m: number) => clamp(((m - MIN_HOUR*60) / totalSpan) * 100);
                                
                                const fillLeft  = toPercent(startMins);
                                const fillRight = toPercent(endMins);
                                const breakLeft  = toPercent(lunchSMins);
                                const breakRight = toPercent(lunchEMins);

                                const ticks = [6,8,10,12,14,16,18,20,22];
                                return (
                                   <div style={{ marginBottom: '2rem' }}>
                                      <div className="timeline-bar-track" style={{ marginBottom: '2rem' }}>
                                         {/* Active window */}
                                         <div className="timeline-bar-fill" style={{ left: `${fillLeft}%`, width: `${Math.max(0, fillRight - fillLeft)}%` }} />
                                         {/* Break cutout */}
                                         {lunchSMins < lunchEMins && (
                                            <div className="timeline-bar-break" style={{ left: `${breakLeft}%`, width: `${Math.max(0, breakRight - breakLeft)}%` }} />
                                         )}
                                         {/* Hour ticks */}
                                         {ticks.map(h => (
                                            <span key={h} className="timeline-tick" style={{ left: `${toPercent(h*60)}%` }}>
                                               {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}
                                            </span>
                                         ))}
                                      </div>

                                      {/* Legend */}
                                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--primary)' }} /><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Active Window</span></div>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(244,63,94,0.4)' }} /><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Break Block</span></div>
                                      </div>
                                   </div>
                                );
                             })()}

                             {/* Time pickers in a clean 2-col grid */}
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.5rem' }}>Window Opens</label>
                                  <input type="time" value={genStart} onChange={e=>setGenStart(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.5rem' }}>Window Closes</label>
                                  <input type="time" value={genEnd} onChange={e=>setGenEnd(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                                </div>
                             </div>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(244,63,94,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.5rem' }}>Break Starts</label>
                                  <input type="time" value={genLunchStart} onChange={e=>setGenLunchStart(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(244,63,94,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.5rem' }}>Break Ends</label>
                                  <input type="time" value={genLunchEnd} onChange={e=>setGenLunchEnd(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                                </div>
                             </div>
                          </div>

                          {/* 4. Slot Rhythm — Stepper Controls */}
                          <div className="glass-panel" style={{ margin: 0, padding: '1.75rem' }}>
                             <span style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: '1.5rem' }}>04 — Slot Rhythm</span>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                   <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.75rem' }}>Duration <span style={{ color: 'var(--primary)' }}>mins</span></label>
                                   <div className="stepper-field">
                                      <button className="stepper-btn" onClick={() => setGenDuration(Math.max(5, genDuration - 5))}>−</button>
                                      <span className="stepper-value">{genDuration}</span>
                                      <button className="stepper-btn" onClick={() => setGenDuration(genDuration + 5)}>+</button>
                                   </div>
                                </div>
                                <div>
                                   <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.75rem' }}>Gap Offset <span style={{ color: 'var(--primary)' }}>mins</span></label>
                                   <div className="stepper-field">
                                      <button className="stepper-btn" onClick={() => setGenBreak(Math.max(0, genBreak - 5))}>−</button>
                                      <span className="stepper-value">{genBreak}</span>
                                      <button className="stepper-btn" onClick={() => setGenBreak(genBreak + 5)}>+</button>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* ━━━ RIGHT COLUMN: Sidebar ━━━ */}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>
                          
                          {/* Mission Control Card — flips between Estimation and Mission Report */}
                          <div style={{ background: 'linear-gradient(145deg, #1a1025 0%, #0f0a1e 100%)', border: '1px solid rgba(139,92,246,0.2)', padding: '2rem', borderRadius: '28px', boxShadow: '0 0 0 1px rgba(139,92,246,0.05), 0 30px 60px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden', minHeight: '340px' }}>
                             {/* Moving gradient orb */}
                             <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
                             <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />

                             {missionReport ? (
                                /* ✅ MISSION REPORT TERMINAL */
                                <div className="animate-fade-in">
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: genLoading ? '#fbbf24' : '#34d399', boxShadow: genLoading ? '0 0 12px #fbbf24' : '0 0 12px #34d399' }} />
                                      <span style={{ fontSize: '0.7rem', color: genLoading ? '#fbbf24' : '#34d399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{genLoading ? 'Processing Batch...' : 'Mission Complete'}</span>
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                                       {missionReport.lines.map((line, i) => {
                                          const getLineColor = (l: string) => {
                                             if (l.startsWith('SUCCESS:')) return '#34d399';
                                             if (l.startsWith('INFO:')) return '#c4b5fd';
                                             if (l.startsWith('WARN:')) return '#fbbf24';
                                             return 'rgba(255,255,255,0.5)';
                                          };
                                          const getCleanLineText = (l: string) => {
                                             if (l.startsWith('SUCCESS:')) return l.substring(8);
                                             if (l.startsWith('INFO:')) return l.substring(5);
                                             if (l.startsWith('WARN:')) return l.substring(5);
                                             return l;
                                          };
                                          const getBullet = (l: string) => {
                                             if (l.startsWith('SUCCESS:')) return <span style={{ color: '#34d399', marginRight: '0.6rem' }}>●</span>;
                                             if (l.startsWith('INFO:')) return <span style={{ color: '#c4b5fd', marginRight: '0.6rem' }}>●</span>;
                                             if (l.startsWith('WARN:')) return <span style={{ color: '#fbbf24', marginRight: '0.6rem' }}>●</span>;
                                             return null;
                                          };
                                          return (
                                             <div key={i} className="terminal-line" style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', marginBottom: '0.15rem' }}>
                                                {getBullet(line)}
                                                <span>{getCleanLineText(line)}</span>
                                             </div>
                                          );
                                       })}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                                       <div>
                                          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{missionReport.totalSlots}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>slots generated across {missionReport.totalDays} day{missionReport.totalDays !== 1 ? 's' : ''}</div>
                                       </div>
                                       <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#a78bfa', lineHeight: 1 }}>{Math.round(missionReport.totalSlots / Math.max(1, missionReport.totalDays))}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>slots/day avg</div>
                                       </div>
                                    </div>
                                    <button onClick={() => setMissionReport(null)} disabled={genLoading} style={{ width: '100%', padding: '0.875rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, cursor: genLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>← Configure New Batch</button>
                                 </div>
                             ) : (
                                 /* 📡 IMPACT ESTIMATION */
                                 <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
                                       <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Live Estimation</span>
                                    </div>
 
                                    {/* Slot count display */}
                                    {(() => {
                                       if (!genStartDate || !genEndDate || !genStart || !genEnd) return (
                                          <div style={{ marginBottom: '2rem' }}>
                                             <div style={{ fontSize: '4rem', fontWeight: 900, color: 'rgba(255,255,255,0.15)', lineHeight: 1, letterSpacing: '-0.03em' }}>—</div>
                                             <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Set dates to preview.</p>
                                          </div>
                                       );
                                       const startD = new Date(genStartDate + 'T12:00:00');
                                       const endD   = new Date(genEndDate + 'T12:00:00');
                                       let dayCount = 0; let d = new Date(startD);
                                       while (d <= endD) { if (genSelectedDays.includes(d.getDay())) dayCount++; d.setDate(d.getDate()+1); }
                                       
                                       const [sh, sm] = genStart.split(':').map(Number);
                                       const [eh, em] = genEnd.split(':').map(Number);
                                       let totalMins = (eh * 60 + em) - (sh * 60 + sm);
                                       if (genLunchStart && genLunchEnd) {
                                          const [lsh, lsm] = genLunchStart.split(':').map(Number);
                                          const [leh, lem] = genLunchEnd.split(':').map(Number);
                                          totalMins -= (leh * 60 + lem) - (lsh * 60 + lsm);
                                       }
                                       const perDay = Math.max(0, Math.floor(totalMins / (Number(genDuration) + Number(genBreak))));
                                       const total  = dayCount * perDay;
                                       return (
                                          <div style={{ marginBottom: '2rem' }}>
                                             <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>{total}</div>
                                             <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                                                <div><span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{dayCount}</span><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.3rem' }}>days</span></div>
                                                <div><span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>{perDay}</span><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.3rem' }}>slots/day</span></div>
                                             </div>
                                             <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '0.5rem' }}>presentation slots will be created</p>
                                             
                                             {/* Slot pill preview strip — tiny visual pills */}
                                             {perDay > 0 && perDay <= 20 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '1rem' }}>
                                                   {Array.from({ length: Math.min(perDay, 20) }).map((_, i) => (
                                                      <div key={i} style={{ height: '6px', flex: '1 0 8px', borderRadius: '3px', background: 'rgba(139,92,246,0.4)', animation: `terminal-type 0.3s ease ${i * 0.05}s forwards`, opacity: 0 }} />
                                                   ))}
                                                </div>
                                             )}
                                          </div>
                                       );
                                    })()}

                                    <button 
                                       onClick={async () => {
                                          if (!genStartDate || !genEndDate || !genStart || !genEnd) return showToast("Please complete all fields.", "error");
                                          if (genTargetProjectId === 'NEW' && !newProjectTitle.trim()) {
                                             return showToast("Please enter an assignment name.", "error");
                                           }
                                          const startD = new Date(genStartDate + 'T12:00:00');
                                          const endD   = new Date(genEndDate + 'T12:00:00');
                                          if (startD > endD) return showToast("Start date must be before End date.", "error");
                                          
                                          setGenLoading(true);
                                          
                                          const reportLines: string[] = [
                                             'WARN:Initializing batch launch...',
                                             'INFO:Establishing secure database connection...',
                                          ];
                                          setMissionReport({ lines: [...reportLines], totalSlots: 0, totalDays: 0 });
                                          await new Promise(r => setTimeout(r, 400));

                                          let projectId = genTargetProjectId;
                                          if (genTargetProjectId === 'NEW') {
                                             reportLines.push(`INFO:Creating assignment directive "${newProjectTitle}"...`);
                                             setMissionReport({ lines: [...reportLines], totalSlots: 0, totalDays: 0 });
                                             
                                             const { data: pd, error: pe } = await supabase.from('projects').insert([{ course_id: activeCourseId, title: newProjectTitle, max_group_size: 5 }]).select().single();
                                             if (pe) { 
                                                showToast("Error creating project", "error"); 
                                                setGenLoading(false); 
                                                return; 
                                             }
                                             projectId = pd.id; 
                                             setProjects(prev => [...prev, pd]); 
                                             setGenTargetProjectId(pd.id);
                                             reportLines.push(`SUCCESS:Assignment created successfully! ID: ${pd.id.substring(0, 8)}...`);
                                             setMissionReport({ lines: [...reportLines], totalSlots: 0, totalDays: 0 });
                                             await new Promise(r => setTimeout(r, 300));
                                          }

                                          let totalSlots = 0, processedDays = 0;
                                          let cur = new Date(startD);
                                          
                                          const [sh, sm] = genStart.split(':').map(Number);
                                          const [eh, em] = genEnd.split(':').map(Number);
                                          const maxMins = eh * 60 + em;
                                          const duration = Number(genDuration);
                                          const breakTime = Number(genBreak);

                                          reportLines.push('INFO:Starting timeline generator queue...');
                                          setMissionReport({ lines: [...reportLines], totalSlots, totalDays: 0 });
                                          await new Promise(r => setTimeout(r, 300));

                                          while (cur <= endD) {
                                             if (genSelectedDays.includes(cur.getDay())) {
                                                const yyyy = cur.getFullYear();
                                                const mm = String(cur.getMonth() + 1).padStart(2, '0');
                                                const dd = String(cur.getDate()).padStart(2, '0');
                                                const dateStr = `${yyyy}-${mm}-${dd}`;
                                                const dayName = cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                                
                                                reportLines.push(`INFO:Generating slots for ${dayName}...`);
                                                setMissionReport({ lines: [...reportLines], totalSlots, totalDays: processedDays });
                                                
                                                const { data: ev, error: ee } = await supabase.from('events').insert([{ project_id: projectId, title: `${newProjectTitle || 'Session'} Slots`, date: dateStr }]).select().single();
                                                if (!ee) {
                                                   const daySlots: any[] = [];
                                                   let currentMins = sh * 60 + sm;
                                                   
                                                   while (currentMins < maxMins) {
                                                      const nextMins = currentMins + duration;
                                                      if (genLunchStart && genLunchEnd) {
                                                         const [lsh, lsm] = genLunchStart.split(':').map(Number);
                                                         const [leh, lem] = genLunchEnd.split(':').map(Number);
                                                         const ls = lsh * 60 + lsm;
                                                         const le = leh * 60 + lem;
                                                         if ((currentMins >= ls && currentMins < le) || (nextMins > ls && nextMins <= le) || (currentMins <= ls && nextMins >= le)) {
                                                            currentMins = le;
                                                            continue;
                                                         }
                                                      }
                                                      if (nextMins > maxMins) break;
                                                      
                                                      const formatMins = (m: number) => {
                                                         const h = Math.floor(m / 60);
                                                         const mins = m % 60;
                                                         return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                                                      };
                                                      
                                                      const startStr = formatMins(currentMins);
                                                      const endStr = formatMins(nextMins);
                                                      
                                                      daySlots.push({ 
                                                         event_id: ev.id, 
                                                         start_time: startStr + ':00', 
                                                         end_time: endStr + ':00', 
                                                         status: 'AVAILABLE' 
                                                      });
                                                      
                                                      currentMins = nextMins + breakTime;
                                                   }
                                                   
                                                   if (daySlots.length > 0) { 
                                                      await supabase.from('slots').insert(daySlots); 
                                                      totalSlots += daySlots.length; 
                                                   }
                                                   
                                                   reportLines.pop();
                                                   reportLines.push(`SUCCESS:${dayName} — ${daySlots.length} slots generated`);
                                                   processedDays++;
                                                   setMissionReport({ lines: [...reportLines], totalSlots, totalDays: processedDays });
                                                   
                                                   await new Promise(r => setTimeout(r, 200));
                                                } else {
                                                   reportLines.push(`WARN:Failed to generate for ${dayName}: ${ee.message}`);
                                                   setMissionReport({ lines: [...reportLines], totalSlots, totalDays: processedDays });
                                                }
                                             }
                                             cur.setDate(cur.getDate() + 1);
                                          }
                                          
                                          reportLines.push('', `SUCCESS:Batch launch committed. ${totalSlots} slots online ✓`);
                                          setMissionReport({ lines: [...reportLines], totalSlots, totalDays: processedDays });
                                          setGenLoading(false);
                                          loadWorkspacePulse(activeCourseId!);
                                       }}
                                       disabled={genLoading}
                                       style={{ width: '100%', padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary), #6d28d9)', color: '#fff', fontWeight: 900, fontSize: '1.05rem', borderRadius: '18px', border: 'none', boxShadow: '0 8px 24px rgba(139,92,246,0.3)', cursor: genLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.01em' }}
                                       onMouseOver={e => !genLoading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 12px 32px rgba(139,92,246,0.45)')}
                                       onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,92,246,0.3)')}
                                    >
                                       {genLoading ? <><Hourglass size={18} style={{ marginRight: '0.5rem' }}/> Generating...</> : '⚡ Execute Batch Launch'}
                                    </button>
                                 </div>
                             )}
                          </div>

                          {/* Active Directives */}
                          <div className="glass-panel" style={{ margin: 0, padding: '1.5rem' }}>
                             <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: '1.25rem' }}>Active Directives</h3>
                             {projects.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>No assignments yet.</p>
                             ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                   {projects.map(p => (
                                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                         <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{p.title}</div>
                                         <button onClick={() => handleDeleteProject(p.id)} style={{ background: 'none', border: 'none', color: 'rgba(244,63,94,0.5)', padding: '0.25rem', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='#f43f5e'} onMouseOut={e=>e.currentTarget.style.color='rgba(244,63,94,0.5)'}><XOctagon size={15}/></button>
                                      </div>
                                   ))}
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                    )}
                 </div>
               )}

               {activeTab === 'waitlist' && (
                 <div className="animate-fade-in-up">
                    <header style={{ marginBottom: '3rem' }}>
                      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Waitlist Queue</h1>
                      <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', maxWidth: '600px' }}>Groups on standby waiting for an open slot.</p>
                    </header>
                    
                    {waitlistLoading ? (
                       <TableSkeleton />
                    ) : waitlistEntries.length === 0 ? (
                       <div className="empty-state" style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                          <div className="empty-state-icon" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ListOrdered size={32} /></div>
                          <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Waitlist is Empty</h3>
                          <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '0 auto' }}>Groups who miss the initial booking window will appear here for manual promotion.</p>
                       </div>
                    ) : (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {waitlistEntries.map(entry => (
                             <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div>
                                   <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{entry.groups?.name || 'Unknown Group'}</div>
                                   <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>{entry.projects?.title || 'Unknown Assignment'}</div>
                                </div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'right' }}>
                                       Joined: {new Date(entry.created_at).toLocaleString()}
                                    </div>
                                    <button 
                                      onClick={() => handlePromoteFromWaitlist(entry)}
                                      className="btn btn-primary" 
                                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                    >
                                      Promote to Slot
                                    </button>
                                 </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
               )}

               {activeTab === 'groups' && (
                 <div className="animate-fade-in-up">
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                       <div>
                          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Group Manager</h1>
                          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', maxWidth: '600px' }}>Comprehensive management and member tracking for all project teams.</p>
                       </div>
                       <div style={{ position: 'relative', width: '300px' }}>
                          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                          <input 
                             type="text" placeholder="Search groups..." 
                             value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                             style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', color: '#fff', outline: 'none' }} 
                          />
                       </div>
                    </header>
                    
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                       {/* Header Row */}
                       <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.5fr', padding: '1rem 2rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--card-border)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                         <span>Group Name</span><span>Invite Code</span><span>Members</span><span style={{ textAlign: 'right' }}>Details</span>
                       </div>
                       
                       {groupsLoading ? (
                          <div style={{ padding: '4rem', textAlign: 'center' }}><Hourglass className="animate-spin text-primary" size={32} style={{ margin: '0 auto' }}/></div>
                       ) : courseGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                          <div className="empty-state" style={{ padding: '5rem', border: 'none' }}>
                             <div className="empty-state-icon" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={32} /></div>
                             <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{searchTerm ? 'No results found' : 'No Groups Formed'}</h3>
                             <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', margin: '0 auto' }}>{searchTerm ? `Try searching for something else than "${searchTerm}"` : 'Teams will appear here once students join via the project invite code.'}</p>
                          </div>
                       ) : (
                          <div>
                            {courseGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).map(function(grp: any) {
                              const members: any[] = grp.group_members || [];
                              const isExpanded = expandedRecordId === grp.id;
                              return (
                                <div key={grp.id} style={{ borderBottom: '1px solid var(--card-border)', overflow: 'hidden', transition: 'all 0.2s' }}>
                                  {/* Collapsed Header Row — always visible */}
                                  <div
                                    onClick={() => setExpandedRecordId(isExpanded ? null : grp.id)}
                                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.5fr', padding: '1.25rem 2rem', cursor: 'pointer', alignItems: 'center', background: isExpanded ? 'rgba(139,92,246,0.05)' : 'transparent', transition: 'background 0.2s' }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>{grp.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>Created: {new Date(grp.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                      <span className="badge" style={{ background: 'transparent', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', fontSize: '0.75rem', margin: 0 }}>{grp.invite_code}</span>
                                    </div>
                                    <div style={{ color: 'var(--primary)', fontWeight: 800 }}>{members.length} member{members.length !== 1 ? 's' : ''}</div>
                                    <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>
                                      {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                    </div>
                                  </div>

                                  {/* Expanded Member Roster */}
                                  {isExpanded && (
                                    <div className="animate-fade-in-down" style={{ padding: '0 2rem 1.5rem 2rem', borderTop: '1px solid rgba(139,92,246,0.15)', background: 'rgba(139,92,246,0.02)' }}>
                                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.75rem' }}>
                                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Member Roster</div>
                                          <button 
                                             onClick={(e) => { e.stopPropagation(); handleDeleteGroup(grp); }}
                                             style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                             onMouseOver={e => e.currentTarget.style.background = 'rgba(244,63,94,0.12)'}
                                             onMouseOut={e => e.currentTarget.style.background = 'rgba(244,63,94,0.06)'}
                                          >
                                             Delete Team
                                          </button>
                                       </div>
                                      {members.length === 0 ? (
                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', fontStyle: 'italic' }}>No members have joined this group yet.</div>
                                      ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                          {members.map(function(mem: any, mi: number) {
                                            const u = mem.users;
                                            if (!u) return null;
                                            const uid = u.id || mem.student_id;
                                            const isLeader = uid === grp.leader_id;
                                            return (
                                              <div key={uid || mi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', background: isLeader ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '10px', border: isLeader ? '1px solid rgba(139,92,246,0.25)' : '1px solid var(--card-border)' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isLeader ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: isLeader ? '#c4b5fd' : 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                                                  {u.full_name?.substring(0,2).toUpperCase() || '??'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                  <div style={{ fontWeight: 700, color: isLeader ? '#c4b5fd' : '#fff', fontSize: '0.9rem' }}>{u.full_name}</div>
                                                </div>
                                                {isLeader && (
                                                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', borderRadius: '20px', fontWeight: 800, letterSpacing: '0.05em' }}>LEADER</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                       )}
                    </div>
                 </div>
               )}

               {activeTab === 'gradebook' && (
                 <div className="animate-fade-in-up">
                    <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <div>
                          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Grade Registry</h1>
                          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', maxWidth: '600px' }}>Permanent records of finalized presentations and professor evaluations.</p>
                       </div>
                       <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div style={{ position: 'relative', width: '250px' }}>
                             <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                             <input 
                                type="text" placeholder="Lookup record..." 
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem' }} 
                             />
                          </div>
                          <button 
                             onClick={downloadGradeRegistryCSV}
                             className="btn btn-secondary btn-sm" 
                             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                             <Download size={16} /> CSV
                          </button>
                       </div>
                    </header>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Table Header Row */}
                        {scheduleSlots.filter(s => s.status === 'PRESENTED' || s.status === 'ABSENT').length === 0 ? (
                           <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                              <FileText size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
                              <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>No Records Yet</h3>
                              <p style={{ color: 'rgba(255,255,255,0.5)' }}>Grade sessions from the Master Schedule. Sealed records will appear here.</p>
                           </div>
                        ) : (
                           <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: 'none' }}>
                                 <colgroup>
                                    <col style={{ width: '25%' }} />
                                    <col style={{ width: '30%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '10%' }} />
                                 </colgroup>
                                 <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                                       <th style={{ padding: '1rem 2rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, border: 'none' }}>Group Code</th>
                                       <th style={{ padding: '1rem 2rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, border: 'none' }}>Time Log</th>
                                       <th style={{ padding: '1rem 2rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, border: 'none' }}>Result</th>
                                       <th style={{ padding: '1rem 2rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, border: 'none' }}>Score</th>
                                       <th style={{ padding: '1rem 2rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, border: 'none' }}>Details</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {scheduleSlots.filter(s => (s.status === 'PRESENTED' || s.status === 'ABSENT') && (s.groups?.name.toLowerCase().includes(searchTerm.toLowerCase()))).map(slot => {
                                       const isExpanded = expandedRecordId === slot.id;
                                       
                                       return (
                                          <Fragment key={slot.id}>
                                             <tr 
                                                onClick={() => setExpandedRecordId(isExpanded ? null : slot.id)}
                                                style={{ cursor: 'pointer', background: isExpanded ? 'rgba(139, 92, 246, 0.05)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                                             >
                                                <td style={{ padding: '1.25rem 2rem', textAlign: 'left', verticalAlign: 'middle', border: 'none', fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
                                                   {slot.groups?.name || 'Unknown Group'}
                                                </td>
                                                <td style={{ padding: '1.25rem 2rem', textAlign: 'left', verticalAlign: 'middle', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: 600 }}>
                                                   {slot.event_date} • {slot.start_time.substring(0,5)}
                                                </td>
                                                <td style={{ padding: '1.25rem 2rem', textAlign: 'center', verticalAlign: 'middle', border: 'none' }}>
                                                   {slot.status === 'PRESENTED' ? (
                                                      <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: 'none', margin: 0 }}><CheckCircle2 size={12} style={{marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px'}}/> Present</span>
                                                   ) : (
                                                      <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', margin: 0 }}><XOctagon size={12} style={{marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px'}}/> Absent</span>
                                                   )}
                                                </td>
                                                <td style={{ padding: '1.25rem 2rem', textAlign: 'center', verticalAlign: 'middle', border: 'none', fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
                                                   {slot.grade || <span style={{ color: 'rgba(255,255,255,0.2)' }}>--/--</span>}
                                                </td>
                                                <td style={{ padding: '1.25rem 2rem', textAlign: 'center', verticalAlign: 'middle', border: 'none', color: 'rgba(255,255,255,0.4)' }}>
                                                   {isExpanded ? <ChevronDown size={20} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> : <ChevronRight size={20} style={{ display: 'inline-block', verticalAlign: 'middle' }} />}
                                                </td>
                                             </tr>
                                             {isExpanded && (
                                                <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                   <td colSpan={5} style={{ padding: '0 2rem 2rem 2rem', border: 'none' }}>
                                                      <div style={{ display: 'flex', gap: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                                         <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 800 }}>Professor Insights</div>
                                                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', lineHeight: '1.6', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                               {slot.private_notes || <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No notes provided for this session.</span>}
                                                            </div>
                                                         </div>
                                                         
                                                         <div style={{ width: '220px', background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.1) 0%, rgba(0,0,0,0) 100%)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: 'rgba(139, 92, 246, 0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '0.5rem' }}>Final Extracted Score</div>
                                                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>{slot.grade || '--'}</div>
                                                         </div>
                                                      </div>
                                                   </td>
                                                </tr>
                                             )}
                                          </Fragment>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* STUDENT DIRECTORY MODULE */}
               {activeTab === 'directory' && (
                  <div className="animate-fade-in-up">
                     <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                           <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', padding: '0.3rem 0.75rem', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registered Students</span>
                           </div>
                           <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.02em' }}>Student List</h1>
                           <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem', fontSize: '1rem' }}>Comprehensive list of registered students with section details, roll numbers, and team assignments.</p>
                        </div>

                        <button onClick={downloadStudentDirectoryCSV}
                           style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', background: 'linear-gradient(135deg, #34d399, #059669)', color: '#000', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(52,211,153,0.25)', transition: 'all 0.2s' }}
                           onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                           onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                           <Download size={18} /> Download Student List (CSV)
                        </button>
                     </header>

                     {/* Summary Cards */}
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}>
                           <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Total Enrolled</div>
                           <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-outfit)' }}>{directoryStudents.length}</div>
                        </div>
                        <div style={{ padding: '1.5rem', background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '20px' }}>
                           <div style={{ fontSize: '0.65rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Team Assigned</div>
                           <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-outfit)' }}>{directoryStudents.filter(s => s.teamName).length}</div>
                        </div>
                        <div style={{ padding: '1.5rem', background: 'rgba(244,63,94,0.03)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: '20px' }}>
                           <div style={{ fontSize: '0.65rem', color: '#f43f5e', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Unassigned</div>
                           <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f43f5e', fontFamily: 'var(--font-outfit)' }}>{directoryStudents.filter(s => !s.teamName).length}</div>
                        </div>
                     </div>

                     {/* Search, Filter & Sort Controls */}
                     <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '400px' }}>
                           <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                           <input type="text" placeholder="Search name, roll number, team, or email..." value={directorySearch} onChange={e => setDirectorySearch(e.target.value)}
                              style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                           />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                           <select value={directoryFilter} onChange={e => setDirectoryFilter(e.target.value)}
                              style={{ padding: '0.875rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', outline: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                           >
                              <option value="ALL">All Students</option>
                              <option value="SEC_A">Section A</option>
                              <option value="SEC_B">Section B</option>
                              <option value="SEC_C">Section C</option>
                              <option value="SEC_D">Section D</option>
                              <option value="ASSIGNED">Team Assigned</option>
                              <option value="UNASSIGNED">Unassigned</option>
                           </select>

                           <select value={directorySort} onChange={e => setDirectorySort(e.target.value)}
                              style={{ padding: '0.875rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', outline: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                           >
                              <option value="NAME">Sort by Name (A-Z)</option>
                              <option value="ROLL">Sort by Roll Number</option>
                              <option value="SECTION">Sort by Section</option>
                              <option value="TEAM">Sort by Team Name</option>
                           </select>
                        </div>
                     </div>

                     {/* Roster Table */}
                     <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', overflow: 'hidden' }}>
                        {directoryLoading ? (
                           <TableSkeleton />
                        ) : directoryStudents.length === 0 ? (
                           <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No students enrolled in this workspace yet.</div>
                        ) : (() => {
                           const filtered = directoryStudents
                              .filter(s => {
                                 const term = directorySearch.toLowerCase().trim();
                                 const matchesSearch = !term || (
                                    s.full_name?.toLowerCase().includes(term) ||
                                    s.email?.toLowerCase().includes(term) ||
                                    s.roll_number?.toLowerCase().includes(term) ||
                                    s.teamName?.toLowerCase().includes(term) ||
                                    s.parsedRoll.section?.toLowerCase().includes(term)
                                 );

                                 if (!matchesSearch) return false;

                                 if (directoryFilter === 'ASSIGNED') return !!s.teamName;
                                 if (directoryFilter === 'UNASSIGNED') return !s.teamName;
                                 if (directoryFilter.startsWith('SEC_')) {
                                    const secLetter = directoryFilter.split('_')[1];
                                    return s.parsedRoll.section === `Section ${secLetter}`;
                                 }
                                 return true;
                              })
                              .sort((a, b) => {
                                 if (directorySort === 'NAME') return (a.full_name || '').localeCompare(b.full_name || '');
                                 if (directorySort === 'ROLL') return (a.roll_number || '').localeCompare(b.roll_number || '');
                                 if (directorySort === 'SECTION') return (a.parsedRoll.section || '').localeCompare(b.parsedRoll.section || '');
                                 if (directorySort === 'TEAM') return (a.teamName || 'ZZZ').localeCompare(b.teamName || 'ZZZ');
                                 return 0;
                              });
                           return (
                              <div style={{ overflowX: 'auto' }}>
                                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                    <thead>
                                       <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                          <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Student Name</th>
                                          <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Section</th>
                                          <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Roll Number</th>
                                          <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assigned Team</th>
                                          <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email Address</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {filtered.map(st => (
                                          <tr key={st.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                             <td style={{ padding: '1.1rem 1.5rem', fontWeight: 800, color: '#fff' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                   <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#c4b5fd', flexShrink: 0 }}>
                                                      {st.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                                                   </div>
                                                   <span>{st.full_name}</span>
                                                </div>
                                             </td>
                                             <td style={{ padding: '1.1rem 1.5rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                                                <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                                                   {st.parsedRoll.section}
                                                </span>
                                             </td>
                                             <td style={{ padding: '1.1rem 1.5rem', color: '#34d399', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                                {st.roll_number || 'N/A'}
                                             </td>
                                             <td style={{ padding: '1.1rem 1.5rem' }}>
                                                {st.teamName ? (
                                                   <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', padding: '0.3rem 0.75rem', color: '#34d399', fontSize: '0.75rem', fontWeight: 800 }}>
                                                      {st.teamName}
                                                   </div>
                                                ) : (
                                                   <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '8px', padding: '0.3rem 0.75rem', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 800 }}>
                                                      No Team
                                                   </div>
                                                )}
                                             </td>
                                             <td style={{ padding: '1.1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                                                {st.email}
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           );
                        })()}
                     </div>
                  </div>
               )}
               {activeTab === 'settings' && (
                  <div className="animate-fade-in-up">
                     <header style={{ marginBottom: '3rem' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Workspace Settings</h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', maxWidth: '600px' }}>Manage workspace name, section, and system deletion.</p>
                     </header>

                     {/* Edit Course Form */}
                     <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff' }}>Edit Details</h3>
                        <form onSubmit={handleUpdateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                           <div>
                              <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 600 }}>Course Name</label>
                              <input 
                                 type="text" 
                                 value={editCourseName} 
                                 onChange={e=>setEditCourseName(e.target.value)} 
                                 required 
                                 style={{ width: '100%', padding: '0.875rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} 
                              />
                           </div>
                           
                           <div>
                              <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 600 }}>Section / Batch</label>
                              <input 
                                 type="text" 
                                 value={editCourseSection} 
                                 onChange={e=>setEditCourseSection(e.target.value)} 
                                 required 
                                 style={{ width: '100%', padding: '0.875rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} 
                              />
                           </div>

                           <button type="submit" disabled={updatingCourse} className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.875rem 2rem' }}>
                              {updatingCourse ? 'Saving Changes...' : 'Save Changes'}
                           </button>
                        </form>
                     </div>

                     {/* Delete Course Area */}
                     <div className="glass-panel" style={{ padding: '2.5rem', border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.02)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f43f5e' }}>Danger Zone</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.95rem' }}>Once you delete a workspace, there is no going back. All courses, projects, scheduled sessions, student grades, and groups will be permanently erased.</p>
                        
                        <button 
                           type="button"
                           onClick={handleDeleteCourse}
                           style={{ padding: '1rem 2rem', background: '#f43f5e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 16px rgba(244, 63, 94, 0.2)', transition: 'all 0.2s' }}
                           onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                           onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                           Delete Workspace
                        </button>
                     </div>
                  </div>
               )}
            </div>
         )}
      </main>

      {/* =========================================================
          SESSION MANAGEMENT OVERLAY (HUD)
          ========================================================= */}
      {manageSlot && (
        <div className="animate-fade-in-up" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,5,10,0.85)', backdropFilter: 'blur(40px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          
          {/* Main Focus Container */}
          <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
             
             {/* Header Section */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'inline-block', padding: '0.6rem 1.25rem', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd', borderRadius: '30px', fontSize: '0.875rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '0.1em' }}>
                     {manageSlot.event_date} • {manageSlot.start_time.substring(0,5)} - {manageSlot.end_time.substring(0,5)}
                  </div>
                  <h2 style={{ fontSize: '5rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>{manageSlot.groups?.name || 'Lost Group'}</h2>
                </div>
                <button onClick={() => setManageSlot(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={e=>{e.currentTarget.style.transform='rotate(90deg) scale(1.1)'; e.currentTarget.style.background='rgba(255,255,255,0.15)'}} onMouseOut={e=>{e.currentTarget.style.transform='none'; e.currentTarget.style.background='rgba(255,255,255,0.05)'}}>
                   <XOctagon size={28} />
                </button>
             </div>

             {/* Two Column Control Surface */}
             <div className="modal-grid">
                
                {/* Left: Status Control Panel */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '32px', padding: '2rem' }}>
                   <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2rem', fontWeight: 800 }}>Session Outcome</h3>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {[
                       { val: 'BOOKED', label: 'Pending', icon: <Clock size={20}/>, col: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
                       { val: 'PRESENTED', label: 'Success', icon: <CheckCircle2 size={20}/>, col: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
                       { val: 'ABSENT', label: 'Absent', icon: <XOctagon size={20}/>, col: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
                       { val: 'AVAILABLE', label: 'Kick Group', icon: <Lock size={20}/>, col: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' }
                     ].map(st => (
                        <button 
                           key={st.val}
                           onClick={() => setManageStatus(st.val)}
                           style={{ 
                             display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                             background: manageStatus === st.val ? st.bg : 'transparent',
                             border: `1px solid ${manageStatus === st.val ? st.col : 'rgba(255,255,255,0.05)'}`,
                             color: manageStatus === st.val ? st.col : 'rgba(255,255,255,0.4)',
                             transform: manageStatus === st.val ? 'scale(1.02)' : 'scale(1)'
                           }}
                        >
                           {st.icon} 
                           <span style={{ fontSize: '1.25rem', fontWeight: manageStatus === st.val ? 800 : 700 }}>{st.label}</span>
                        </button>
                     ))}
                   </div>
                </div>

                {/* Right: Data Input Dash */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                   
                   {/* Massive Grade Input */}
                   <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '32px', padding: '2.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800 }}>Final<br/>Grade</div>
                      <div style={{ display: 'flex', alignItems: 'baseline' }}>
                         <input 
                           type="number" 
                           value={manageGrade} 
                           onChange={e=>setManageGrade(e.target.value)} 
                           placeholder="--"
                           min="0"
                           style={{ width: '180px', background: 'transparent', border: 'none', color: '#fff', fontSize: '6rem', fontWeight: 900, textAlign: 'right', outline: 'none', padding: 0, fontFamily: 'var(--font-outfit)' }}
                         />
                         <span style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.15)', fontWeight: 800, margin: '0 0.5rem' }}>/</span>
                         <input 
                           type="number" 
                           value={manageMaxGrade} 
                           onChange={e=>setManageMaxGrade(e.target.value)} 
                           placeholder="100"
                           min="0"
                           style={{ width: '120px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '3rem', fontWeight: 800, outline: 'none', padding: 0, fontFamily: 'var(--font-outfit)', transition: 'color 0.2s' }}
                           onFocus={e=>e.currentTarget.style.color='#fff'}
                           onBlur={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}
                         />
                      </div>
                   </div>

                   {/* Open Text Area */}
                   <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '32px', padding: '2.5rem 3rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem', fontWeight: 800 }}>Professor Insights</h3>
                      <textarea 
                        value={manageNotes} 
                        onChange={e=>setManageNotes(e.target.value)} 
                        placeholder="Log detailed private commentary, rubric notes, or presentation critiques here..." 
                        style={{ flex: 1, minHeight: '120px', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.25rem', outline: 'none', resize: 'none', lineHeight: '1.6' }} 
                      />
                   </div>
                </div>

             </div>

             {/* Huge Action Button */}
             <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={saveSlotDetails} disabled={manageSaving} className="btn pulse-glow" style={{ background: '#fff', color: '#000', padding: '1.5rem 4rem', fontSize: '1.35rem', fontWeight: 900, borderRadius: '100px', display: 'flex', gap: '1rem', alignItems: 'center', cursor: manageSaving?'not-allowed':'pointer', border: 'none', transition: 'transform 0.2s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
                   {manageSaving ? <Hourglass className="animate-spin" size={28}/> : <><CheckCircle2 size={28} /> Seal Database Record</>}
                </button>
             </div>

          </div>
        </div>
       )}
 
       {/* =========================================================
           CUSTOM PREMIUM CONFIRMATION MODAL
           ========================================================= */}
       {confirmModal?.isOpen && (
         <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '2rem' }}>
           <div className="animate-scale-in" style={{ background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 25, 0.98))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', width: '100%', maxWidth: '440px', padding: '3rem', position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
             <div style={{ background: 'rgba(244, 63, 94, 0.1)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', marginBottom: '2rem' }}>
               <XOctagon size={32} />
             </div>
             
             <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.01em' }}>{confirmModal.title}</h2>
             <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '3rem' }}>{confirmModal.message}</p>
             
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button 
                   onClick={() => setConfirmModal(null)}
                   style={{ padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                   onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                   onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                   Cancel
                </button>
                <button 
                   onClick={confirmModal.onConfirm}
                   style={{ padding: '1rem', borderRadius: '14px', border: 'none', background: '#f43f5e', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 16px rgba(244, 63, 94, 0.2)', transition: 'all 0.2s' }}
                   onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                   onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                   Finalize Wipe
                </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}