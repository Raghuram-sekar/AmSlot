"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
   CalendarDays, Users, CheckCircle2, Lock, ArrowRight, Hourglass, UserPlus,
   Clock, ArrowLeft, ChevronRight, Hash, LogOut, XOctagon, ListOrdered,
   Calendar as CalendarIcon, RotateCcw, Copy, Check, Sparkles, Zap, Shield, Menu, X, Pencil, History,
   FileText, UploadCloud, Link as LinkIcon, Trash2, ExternalLink, FileCode, Paperclip, Download, FolderUp, Upload
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

// ─── Custom Confirmation Modal ────────────────────────────────────────────────
interface ConfirmModalState {
   isOpen: boolean;
   title: string;
   message: string;
   confirmLabel?: string;
   danger?: boolean;
   onConfirm: () => void;
}

// ─── Roll Number Formatter & Parser ──────────────────────────────────────────
export function formatFullRollNumber(roll: string | null | undefined): string {
   if (!roll || roll === 'N/A') return 'N/A';
   let clean = roll.trim().toUpperCase();
   if (clean.startsWith('U4')) {
      return 'CB.SC.' + clean;
   }
   if (clean.startsWith('CBSC.')) {
      return 'CB.SC.' + clean.replace('CBSC.', '');
   }
   return clean;
}

export function parseAmritaRollNumber(input: string | null | undefined) {
   if (!input) return { rawRoll: '', dept: '', year: '', section: 'General', shortRoll: '', isValid: false };
   
   const formatted = formatFullRollNumber(input);
   let clean = formatted.toUpperCase();
   if (clean.includes('@')) clean = clean.split('@')[0];

   let matchStr = clean;
   if (matchStr.startsWith('CB.SC.')) matchStr = matchStr.replace('CB.SC.', '');
   if (matchStr.startsWith('CBSC')) matchStr = matchStr.replace('CBSC', '');

   const match = matchStr.match(/^U4([A-Z]{3,4})(\d{2})(\d)(\d{2,3})$/);
   if (match) {
      const dept = match[1];
      const year = '20' + match[2];
      const secCode = match[3];
      const index = match[4];
      const secMap: Record<string, string> = { '0': 'A', '1': 'B', '2': 'C', '3': 'D' };
      const sectionName = secMap[secCode] ? `Section ${secMap[secCode]}` : `Sec ${secCode}`;
      
      return {
         rawRoll: formatted,
         dept,
         year,
         section: sectionName,
         shortRoll: `${secCode}${index}`,
         isValid: true
      };
   }

   return {
      rawRoll: formatted,
      dept: '',
      year: '',
      section: 'General',
      shortRoll: formatted,
      isValid: false
   };
}

export default function StudentPortal() {
   const router = useRouter();
   const { showToast } = useToast();

   // Navigation
   const [viewState, setViewState] = useState<'PORTAL' | 'WORKSPACE'>('PORTAL');

   // Auth & Profile
   const [user, setUser] = useState<any>(null);
   const [profile, setProfile] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   // Portal
   const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
   const [joinCodeInput, setJoinCodeInput] = useState('');
   const [joinError, setJoinError] = useState('');

   // Workspace
   const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
   const [activeProject, setActiveProject] = useState<any>(null);
   const [courseProjects, setCourseProjects] = useState<any[]>([]);
   const [myGroup, setMyGroup] = useState<any>(null);
   const [myGroupMembers, setMyGroupMembers] = useState<any[]>([]);

   // Group Formation (wizard)
   const [groupStep, setGroupStep] = useState<'choose' | 'create' | 'join'>('choose');
   const [newGroupName, setNewGroupName] = useState('');
   const [groupInviteInput, setGroupInviteInput] = useState('');
   const [groupLoading, setGroupLoading] = useState(false);

   // Copy-to-clipboard flash
   const [codeCopied, setCodeCopied] = useState(false);

   // Group Rename
   const [isRenamingGroup, setIsRenamingGroup] = useState(false);
   const [tempGroupName, setTempGroupName] = useState('');

   // Profile Editing & Roll Number Modal
   const [editProfileOpen, setEditProfileOpen] = useState(false);
   const [editNameInput, setEditNameInput] = useState('');
   const [editRollInput, setEditRollInput] = useState('');
   const [editProfileSaving, setEditProfileSaving] = useState(false);

   // Booking UI
   const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
   const [activeDate, setActiveDate] = useState('');
   const [events, setEvents] = useState<any[]>([]);
   const [slots, setSlots] = useState<any[]>([]);
   const [bookingLoading, setBookingLoading] = useState(false);
   const [myWaitlistEntry, setMyWaitlistEntry] = useState<any>(null);

   // Custom confirm modal
   const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

   // Document Submissions & Upload Review Documents
   const [submissionFiles, setSubmissionFiles] = useState<any[]>([]);
   const [uploadingFile, setUploadingFile] = useState(false);
   const [showLinkModal, setShowLinkModal] = useState(false);
   const [linkTitleInput, setLinkTitleInput] = useState('');
   const [linkUrlInput, setLinkUrlInput] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);

   // ─── Handlers ───────────────────────────────────────────────────────────────

   const handleCreateGroup = async () => {
      if (!newGroupName || !activeCourseId) return;
      setGroupLoading(true);
      const { data: existingMember } = await supabase
         .from('group_members')
         .select('group_id, groups!inner(course_id)')
         .eq('student_id', user.id)
         .eq('groups.course_id', activeCourseId)
         .maybeSingle();
      if (existingMember) {
         showToast("You are already in a group for this course. Please leave it first.", "error");
         setGroupLoading(false);
         return;
      }
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: groupData, error: groupError } = await supabase.from('groups').insert([{
         course_id: activeCourseId,
         name: newGroupName,
         leader_id: user.id,
         invite_code: inviteCode
      }]).select().single();

      if (groupError || !groupData) {
         showToast("Error creating group: " + groupError?.message, "error");
         setGroupLoading(false);
         return;
      }
      await supabase.from('group_members').insert([{ group_id: groupData.id, student_id: user.id }]);
      setMyGroup({ ...groupData, members: 1 });
      setMyGroupMembers([{ id: user.id, full_name: profile.full_name, email: profile.email }]);
      showToast(`Team created! Share code: ${inviteCode}`, "success");
      setGroupLoading(false);
   };

   const handleJoinGroup = async () => {
      if (!groupInviteInput || !activeCourseId) return;
      setGroupLoading(true);
      const { data: existingMember } = await supabase
         .from('group_members')
         .select('group_id, groups!inner(course_id)')
         .eq('student_id', user.id)
         .eq('groups.course_id', activeCourseId)
         .maybeSingle();
      if (existingMember) {
         showToast("You are already in a group for this course. Please leave it first.", "error");
         setGroupLoading(false);
         return;
      }
      const { data: groupData, error } = await supabase.from('groups').select('*').eq('invite_code', groupInviteInput.toUpperCase()).single();
      if (error || !groupData) {
         showToast("Invalid Invite Code — double-check with your leader.", "error");
         setGroupLoading(false);
         return;
      }
      const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', groupData.id);
      if (count && count >= (activeProject?.max_group_size || 5)) {
         showToast(`Group is full (max ${activeProject?.max_group_size || 5} members).`, "error");
         setGroupLoading(false);
         return;
      }
      const { error: joinError } = await supabase.from('group_members').insert([{ group_id: groupData.id, student_id: user.id }]);
      if (joinError) {
         showToast("You may already be in a group, or an error occurred.", "error");
         setGroupLoading(false);
         return;
      }
      const { data: membersData } = await supabase
         .from('group_members')
         .select('student_id, users(id, full_name, email)')
         .eq('group_id', groupData.id);
      setMyGroup({ ...groupData, members: membersData?.length || 1 });
      setMyGroupMembers(membersData?.map((m: any) => m.users).filter(Boolean) || []);
      showToast(`Joined ${groupData.name}!`, "success");
      setGroupLoading(false);
   };

     const handleLeaveGroup = async () => {
        if (!myGroup || !user) return;
        setConfirmModal({
           isOpen: true,
           title: "Withdraw Squad",
           message: "Are you sure you want to leave this squad? If your squad has locked a slot, it will be automatically released.",
           confirmLabel: "Leave Squad",
           danger: true,
           onConfirm: async () => {
              // 1. Try RPC leave_group first
              let { error: rpcErr } = await supabase.rpc('leave_group', { p_group_id: myGroup.id, p_student_id: user.id });
              if (!rpcErr) {
                 setMyGroup(null);
                 setMyGroupMembers([]);
                 setSelectedSlot(null);
                 if (activeCourseId) reloadGroupData(activeCourseId);
                 reloadSlots();
                 showToast("You have left the squad.", "info");
                 setConfirmModal(null);
                 return;
              }

              // 2. Client-side sequence fallback: always release slot FIRST while user is still member/leader
              const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', myGroup.id);
              const isLastMember = count === 1;

              await supabase.from('slots').update({ status: 'AVAILABLE', group_id: null }).eq('group_id', myGroup.id);

              const { error } = await supabase.from('group_members').delete().eq('group_id', myGroup.id).eq('student_id', user.id);
              if (!error) {
                 if (isLastMember) {
                    await supabase.from('groups').delete().eq('id', myGroup.id);
                 } else if (myGroup.leader_id === user.id) {
                    const { data: nextMember } = await supabase.from('group_members').select('student_id').eq('group_id', myGroup.id).limit(1).maybeSingle();
                    if (nextMember) {
                       await supabase.from('groups').update({ leader_id: nextMember.student_id }).eq('id', myGroup.id);
                    }
                 }
                 setMyGroup(null);
                 setMyGroupMembers([]);
                 setSelectedSlot(null);
                 if (activeCourseId) reloadGroupData(activeCourseId);
                 reloadSlots();
                 showToast("You have successfully withdrawn from the squad.", "info");
              } else {
                 showToast("Error withdrawing from squad: " + error.message, "error");
              }
              setConfirmModal(null);
           }
        });
     };

     const handleRenameGroup = async () => {
        if (!tempGroupName.trim() || tempGroupName.trim() === myGroup.name) {
           setIsRenamingGroup(false);
           return;
        }
        const newName = tempGroupName.trim();
        const { error } = await supabase
           .from('groups')
           .update({ name: newName })
           .eq('id', myGroup.id);
        
        if (error) {
           showToast("Error renaming group: " + error.message, "error");
        } else {
           setMyGroup((prev: any) => prev ? { ...prev, name: newName } : null);
           showToast("Group renamed successfully!", "success");
        }
        setIsRenamingGroup(false);
     };

     const handleSaveProfile = async () => {
        if (!user || !editNameInput.trim()) return;
        setEditProfileSaving(true);
        
        let rollToSave = editRollInput.trim().toUpperCase();
        if (rollToSave.startsWith('U4')) {
           rollToSave = 'CB.SC.' + rollToSave;
        }
        
        const { error } = await supabase
           .from('users')
           .update({
              full_name: editNameInput.trim(),
              roll_number: rollToSave
           })
           .eq('id', user.id);

        if (!error) {
           setProfile((prev: any) => ({ ...prev, full_name: editNameInput.trim(), roll_number: rollToSave }));
           showToast("Profile updated successfully!", "success");
           setEditProfileOpen(false);
        } else {
           showToast("Error updating profile: " + error.message, "error");
        }
        setEditProfileSaving(false);
     };

    const handleCancelBooking = async () => {
       const myCurrentBooking = slots.find(s => s.group_id === myGroup?.id);
       if (!myCurrentBooking || !myGroup) return;
       setConfirmModal({
          isOpen: true,
          title: "Reschedule / Release Slot",
          message: "Releasing this slot will allow your squad to pick a new review date & time. Are you sure you want to proceed?",
          confirmLabel: "Release Slot",
          danger: false,
          onConfirm: async () => {
             // 1. Try RPC release_slot first
             let { error } = await supabase.rpc('release_slot', { p_group_id: myGroup.id });
             if (error) {
                // 2. Client-side fallback
                const res = await supabase.from('slots').update({ status: 'AVAILABLE', group_id: null }).eq('id', myCurrentBooking.id);
                error = res.error;
             }
             if (!error) {
                setSlots(prev => prev.map(s => s.id === myCurrentBooking.id ? { ...s, status: 'AVAILABLE', group_id: null } : s));
                setSelectedSlot(null);
                showToast("Slot released! Please select your new review date and time.", "success");
             } else {
                showToast("Error releasing slot: " + error.message, "error");
             }
             setConfirmModal(null);
          }
       });
    };

   const handleCopyCode = () => {
      if (!myGroup?.invite_code) return;
      navigator.clipboard.writeText(myGroup.invite_code);
      setCodeCopied(true);
      showToast("Invite code copied!", "success");
      setTimeout(() => setCodeCopied(false), 2000);
   };

   // ─── Submission File Handlers ────────────────────────────────────────────────

   const fetchSubmissionFiles = async (slotId: string) => {
      if (!slotId) return;
      const { data, error } = await supabase
         .from('submission_files')
         .select('*')
         .eq('slot_id', slotId)
         .order('created_at', { ascending: false });
      if (data) setSubmissionFiles(data);
   };

   useEffect(() => {
      const bookedSlot = myGroup ? slots.find(s => s.group_id === myGroup.id) : null;
      if (bookedSlot?.id) {
         fetchSubmissionFiles(bookedSlot.id);
         const channel = supabase.channel(`realtime_submission_files_${bookedSlot.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'submission_files', filter: `slot_id=eq.${bookedSlot.id}` }, () => {
               fetchSubmissionFiles(bookedSlot.id);
            })
            .subscribe();
         return () => { supabase.removeChannel(channel); };
      } else {
         setSubmissionFiles([]);
      }
   }, [myGroup?.id, slots]);

   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const bookedSlot = myGroup ? slots.find(s => s.group_id === myGroup.id) : null;
      if (!file || !bookedSlot || !myGroup || !user) return;

      if (submissionFiles.length >= 5) {
         showToast("Submission limit reached (max 5 items per review). Delete an item to add a new one.", "error");
         e.target.value = '';
         return;
      }

      if (file.size > 10 * 1024 * 1024) {
         showToast("File size exceeds 10MB limit. Please upload a smaller file or zip.", "error");
         return;
      }

      setUploadingFile(true);
      const reader = new FileReader();
      reader.onload = async () => {
         const base64Url = reader.result as string;
         
         let fileTypeCategory = 'doc';
         const ext = file.name.split('.').pop()?.toLowerCase() || '';
         if (['pdf'].includes(ext)) fileTypeCategory = 'pdf';
         else if (['ipynb'].includes(ext)) fileTypeCategory = 'ipynb';
         else if (['py', 'cpp', 'c', 'java', 'js', 'ts', 'html', 'css', 'json', 'md', 'txt'].includes(ext)) fileTypeCategory = 'code';
         else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) fileTypeCategory = 'archive';
         else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) fileTypeCategory = 'doc';

         const fileSizeStr = file.size > 1024 * 1024 
            ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
            : (file.size / 1024).toFixed(0) + ' KB';

         const { data, error } = await supabase.from('submission_files').insert([{
            slot_id: bookedSlot.id,
            group_id: myGroup.id,
            uploaded_by: user.id,
            file_name: file.name,
            file_url: base64Url,
            file_type: fileTypeCategory,
            file_size: fileSizeStr
         }]).select().single();

         if (error) {
            if (error.message?.includes('submission_files') || error.code === '42P01') {
               showToast("Database Table Missing: Please run the SQL snippet in your Supabase SQL Editor to create the submission_files table.", "error");
            } else {
               showToast("Error uploading file: " + error.message, "error");
            }
         } else if (data) {
            setSubmissionFiles(prev => [data, ...prev]);
            showToast(`Attached ${file.name}!`, "success");
         }
         setUploadingFile(false);
         e.target.value = '';
      };
      reader.readAsDataURL(file);
   };

   const handleAttachLink = async () => {
      const bookedSlot = myGroup ? slots.find(s => s.group_id === myGroup.id) : null;
      if (!linkTitleInput.trim() || !linkUrlInput.trim() || !bookedSlot || !myGroup || !user) return;

      if (submissionFiles.length >= 5) {
         showToast("Submission limit reached (max 5 items per review). Delete an item to add a new link.", "error");
         return;
      }

      let formattedUrl = linkUrlInput.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
         formattedUrl = 'https://' + formattedUrl;
      }

      const { data, error } = await supabase.from('submission_files').insert([{
         slot_id: bookedSlot.id,
         group_id: myGroup.id,
         uploaded_by: user.id,
         file_name: linkTitleInput.trim(),
         file_url: formattedUrl,
         file_type: 'link',
         file_size: 'URL'
      }]).select().single();

      if (error) {
         if (error.message?.includes('submission_files') || error.code === '42P01') {
            showToast("Database Table Missing: Please run the SQL snippet in your Supabase SQL Editor to create the submission_files table.", "error");
         } else {
            showToast("Error attaching link: " + error.message, "error");
         }
      } else if (data) {
         setSubmissionFiles(prev => [data, ...prev]);
         showToast("Repository link attached!", "success");
         setLinkTitleInput('');
         setLinkUrlInput('');
         setShowLinkModal(false);
      }
   };

   const handleDeleteSubmissionFile = async (fileId: string) => {
      const { error } = await supabase.from('submission_files').delete().eq('id', fileId);
      if (!error) {
         setSubmissionFiles(prev => prev.filter(f => f.id !== fileId));
         showToast("File removed.", "info");
      } else {
         showToast("Error removing file: " + error.message, "error");
      }
   };

   // ─── Auth / Data Loading ─────────────────────────────────────────────────────

   useEffect(() => { checkAuth(); }, []);

    useEffect(() => {
       if (!user) return;
       const channel = supabase.channel('realtime_student_portal')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'course_enrollments', filter: `student_id=eq.${user.id}` }, () => {
             fetchEnrolledCourses(user.id);
          })
          .subscribe();
       return () => { supabase.removeChannel(channel); };
    }, [user?.id, activeCourseId]);

    useEffect(() => {
       if (viewState === 'WORKSPACE' && activeProject && activeCourseId) {
          const channel = supabase.channel('realtime_workspace_student')
             .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => { reloadSlots(); })
             .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist_entries' }, () => {
                if (activeProject) loadProjectData(activeProject);
             })
             .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, async () => {
                const currentGroupId = await reloadGroupData(activeCourseId);
                if (activeProject) loadProjectData(activeProject, currentGroupId);
             })
             .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, async () => {
                const currentGroupId = await reloadGroupData(activeCourseId);
                if (activeProject) loadProjectData(activeProject, currentGroupId);
             })
             .subscribe();
          return () => { supabase.removeChannel(channel); };
       }
    }, [viewState, activeProject?.id, activeCourseId]);

   const reloadSlots = async () => {
      if (!activeProject) return;
      const { data: evData } = await supabase.from('events').select('id').eq('project_id', activeProject.id);
      if (!evData || evData.length === 0) return;
      const evIds = evData.map((e: any) => e.id);
      const { data: slData } = await supabase.from('slots').select('*, groups(id, name)').in('event_id', evIds).order('start_time', { ascending: true });
      if (slData) setSlots(slData);
   };

    useEffect(() => {
       if (!enrolledCourses.length) return;

       // 1. Initial check
       const params = new URLSearchParams(window.location.search);
       const courseId = params.get('course');
       if (courseId && enrolledCourses.some(c => c.id === courseId)) {
          enterWorkspace(courseId);
       }

       // 2. popstate listener
       const handlePopState = (event: PopStateEvent) => {
          const state = event.state;
          if (state && state.viewState === 'WORKSPACE' && state.courseId) {
             setActiveCourseId(state.courseId);
             setViewState('WORKSPACE');
             reloadGroupData(state.courseId);
          } else {
             setActiveCourseId(null);
             setViewState('PORTAL');
          }
       };

       window.addEventListener('popstate', handlePopState);
       return () => window.removeEventListener('popstate', handlePopState);
    }, [enrolledCourses]);

   const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth'); return; }
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
      
      if (userData?.role !== 'STUDENT') { router.push('/professor'); return; }
      setProfile(userData);
      setEditNameInput(userData.full_name || '');
      setEditRollInput(userData.roll_number || '');
      if (!userData.roll_number) {
         setEditProfileOpen(true);
      }
      await fetchEnrolledCourses(session.user.id);
      setLoading(false);
   };

    const fetchEnrolledCourses = async (userId: string) => {
       const { data } = await supabase.from('course_enrollments').select('course_id, courses(*)').eq('student_id', userId);
       const enrolled = data ? data.map((item: any) => item.courses).filter(Boolean) : [];
       setEnrolledCourses(enrolled);
       
       if (activeCourseId && !enrolled.some((c: any) => c.id === activeCourseId)) {
          showToast("Workspace was deleted or you were unenrolled.", "info");
          setViewState('PORTAL');
          setActiveCourseId(null);
       }
    };

   const handleJoinCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      setJoinError('');
      if (!joinCodeInput) return;
      const { data: courseData, error: courseError } = await supabase.from('courses').select('*').eq('join_code', joinCodeInput.toUpperCase()).single();
      if (courseError || !courseData) {
         setJoinError("Code not found. Double-check with your professor.");
         return;
      }
      const { error: enrollError } = await supabase.from('course_enrollments').insert([{ course_id: courseData.id, student_id: user.id }]);
      if (!enrollError) {
         setEnrolledCourses([...enrolledCourses, courseData]);
         setJoinCodeInput('');
         showToast(`Enrolled in ${courseData.name}!`, "success");
      } else {
         setJoinError("Already enrolled, or an error occurred.");
      }
   };

    const reloadGroupData = async (courseId: string) => {
       const { data: memberData } = await supabase.from('group_members').select('group_id, groups(*)').eq('student_id', user.id);
       const activeGroupLink: any = memberData?.find((m: any) => m.groups && m.groups.course_id === courseId);
       let currentGroupId = null;
       
       if (activeGroupLink) {
          currentGroupId = activeGroupLink.group_id;
          const { data: membersData } = await supabase
             .from('group_members')
             .select('student_id, users(id, full_name, email)')
             .eq('group_id', currentGroupId);
          
          const count = membersData?.length || 0;
          setMyGroup({ ...activeGroupLink.groups, members: count || 1 });
          setMyGroupMembers(membersData?.map((m: any) => m.users).filter(Boolean) || []);
       } else {
          setMyGroup(null);
          setMyGroupMembers([]);
       }
       return currentGroupId;
    };

    const exitWorkspace = () => {
       setMobileMenuOpen(false);
       setActiveCourseId(null);
       setViewState('PORTAL');
       if (typeof window !== 'undefined' && window.location.search !== '') {
          window.history.pushState({ viewState: 'PORTAL' }, '', window.location.pathname);
       }
    };
    const enterWorkspace = async (courseId: string) => {
       setMobileMenuOpen(false);
       setActiveCourseId(courseId);
       setViewState('WORKSPACE');
       setGroupStep('choose');
       if (typeof window !== 'undefined' && window.location.search !== `?course=${courseId}`) {
          window.history.pushState({ viewState: 'WORKSPACE', courseId: courseId }, '', `?course=${courseId}`);
       }

       const currentGroupId = await reloadGroupData(courseId);

       const { data: projData } = await supabase.from('projects').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
       if (projData && projData.length > 0) {
          setCourseProjects(projData);
          await loadProjectData(projData[0], currentGroupId);
       } else {
          setCourseProjects([]);
          setActiveProject(null);
          setMyWaitlistEntry(null);
       }
    };

   const loadProjectData = async (project: any, forceGroupId?: string | null) => {
      setActiveProject(project);
      setSelectedSlot(null);
      setGroupStep('choose');
      
      const targetGroupId = forceGroupId !== undefined ? forceGroupId : myGroup?.id;
      if (targetGroupId) {
         const { data: wlData } = await supabase.from('waitlist_entries').select('*').eq('group_id', targetGroupId).eq('project_id', project.id).maybeSingle();
         setMyWaitlistEntry(wlData || null);
      } else {
         setMyWaitlistEntry(null);
      }

      const { data: evData } = await supabase.from('events').select('*').eq('project_id', project.id).order('date', { ascending: true });
      if (evData && evData.length > 0) {
         setEvents(evData);
         setActiveDate(evData[0].date);
         const evIds = evData.map((e: any) => e.id);
         const { data: slData } = await supabase.from('slots').select('*, groups(id, name)').in('event_id', evIds).order('start_time', { ascending: true });
         if (slData) setSlots(slData);
      } else {
         setEvents([]);
         setSlots([]);
      }
   };

   const handleJoinWaitlist = async () => {
      if (!myGroup || !activeProject) return;
      setBookingLoading(true);
      const { data: wlData, error } = await supabase.from('waitlist_entries').insert([{ project_id: activeProject.id, group_id: myGroup.id }]).select().single();
      if (!error && wlData) {
         setMyWaitlistEntry(wlData);
         showToast("Added to the standby waitlist.", "success");
      } else {
         showToast("Waitlist Error: " + error?.message, "error");
      }
      setBookingLoading(false);
   };

   const handleBookSlot = async () => {
      if (!selectedSlot || !myGroup) return;
      if (myGroup.leader_id !== user.id) {
         showToast("Only the Group Leader can lock a slot.", "error");
         return;
      }

      // Block locking slots for past dates
      const targetSlotObj = slots.find(s => s.id === selectedSlot);
      const targetEventObj = targetSlotObj ? events.find(e => e.id === targetSlotObj.event_id) : null;
      const todayStr = new Date().toISOString().split('T')[0];

      if (targetEventObj?.date && targetEventObj.date < todayStr) {
         showToast("Cannot book slots for past dates. Please select an upcoming review date.", "error");
         return;
      }

      setBookingLoading(true);
      const { error: rpcError } = await supabase.rpc('book_slot', { p_slot_id: selectedSlot, p_group_id: myGroup.id });
      if (rpcError) {
         showToast("Booking Rejected: " + rpcError.message, "error");
      } else {
         if (myWaitlistEntry) {
            await supabase.from('waitlist_entries').delete().eq('id', myWaitlistEntry.id);
            setMyWaitlistEntry(null);
         }
         const evIds = events.map((e: any) => e.id);
         const { data: slData } = await supabase.from('slots').select('*').in('event_id', evIds).order('start_time', { ascending: true });
         if (slData) setSlots(slData);
         setSelectedSlot(null);
         showToast("Slot secured! Your team is booked.", "success");
      }
      setBookingLoading(false);
   };

   // ─── Skeletons ───────────────────────────────────────────────────────────────
   const CourseSkeleton = () => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
         {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '260px', borderRadius: '24px' }} />)}
      </div>
   );

   // ─── Derived Values ──────────────────────────────────────────────────────────
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
         <div className="fluid-blob blob-2" style={{ opacity: 0.12, top: '20%', left: '30%', pointerEvents: 'none' }}></div>
         <aside className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`} style={{ width: viewState === 'PORTAL' ? '280px' : '300px' }}>
               <div className="skeleton" style={{ height: '40px', width: '150px', marginBottom: '3rem' }} />
            </aside>
         <main className="main-content">
               <div className="skeleton" style={{ height: '50px', width: '300px', marginBottom: '1rem' }} />
               <div className="skeleton" style={{ height: '20px', width: '500px', marginBottom: '4rem' }} />
               <CourseSkeleton />
            </main>
         </div>
      );
   }

   const activeCourse = enrolledCourses.find(c => c.id === activeCourseId);
   const bookedSlot = myGroup ? slots.find(s => s.group_id === myGroup.id) : null;
   const bookedSlotEvent = bookedSlot ? events.find(e => e.id === bookedSlot.event_id) : null;

   // Hue map for course cards
   const courseHues = ['#8b5cf6', '#34d399', '#f43f5e', '#fbbf24', '#60a5fa'];

   // ─── RENDER ─────────────────────────────────────────────────────────────────
   return (
      <div className="app-container">
         <div className="fluid-blob blob-2" style={{ opacity: 0.12, top: '20%', left: '30%', pointerEvents: 'none' }}></div>

         {/* ═══════════════════════════════════════════════
          SIDEBAR
          ═══════════════════════════════════════════════ */}
         <aside className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`} style={{ width: viewState === 'PORTAL' ? '280px' : '300px' }}>
            {/* Ambient blob */}
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: viewState === 'WORKSPACE' ? '1.5rem' : '3rem' }}>
               <div className="creative-logo" style={{ width: '32px', height: '32px' }}>
                  <div className="ring ring-1" style={{ borderTopColor: 'var(--primary)' }}></div>
                  <div className="logo-core" style={{ borderRadius: '6px' }}><Hourglass size={10} color="#fff" /></div>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-outfit)' }}>Am<span className="text-gradient">Slot</span></span>
                  <span style={{ 
                     padding: '0.1rem 0.4rem', 
                     background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(52,211,153,0.15))', 
                     border: '1px solid rgba(167,139,250,0.3)', 
                     borderRadius: '6px', 
                     fontSize: '0.6rem', 
                     fontWeight: 800, 
                     color: '#34d399', 
                     fontFamily: 'monospace',
                     letterSpacing: '0.04em',
                     transform: 'translateY(-1px)'
                  }}>
                     v2.0
                  </span>
               </div>
            </div>

            {/* ── PORTAL: Profile Card ── */}
            {viewState === 'PORTAL' && (
               <div style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(139,92,246,0.04))', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #34d399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem', fontFamily: 'var(--font-outfit)', flexShrink: 0 }}>
                        {profile?.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                     </div>
                     <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                           <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Student'}</div>
                           <button onClick={() => { setEditNameInput(profile?.full_name || ''); setEditRollInput(profile?.roll_number || ''); setEditProfileOpen(true); }}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', transition: 'color 0.2s', flexShrink: 0 }}
                              onMouseOver={e => e.currentTarget.style.color = '#34d399'}
                              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                              title="Edit Profile Credentials"
                           >
                              <Pencil size={14} />
                           </button>
                        </div>
                        {profile?.roll_number ? (
                           <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 800, marginTop: '0.15rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                              {profile.roll_number}
                           </div>
                        ) : (
                           <div style={{ fontSize: '0.65rem', color: '#f43f5e', fontWeight: 700, marginTop: '0.15rem' }}>
                              ⚠️ Missing Roll Number
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* ── WORKSPACE SIDEBAR ── */}
            {viewState === 'WORKSPACE' && (
               <div className="animate-fade-in-up" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <button onClick={exitWorkspace}
                     style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.875rem 1rem', borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.75rem', transition: 'all 0.2s', width: '100%', textAlign: 'left' }}
                     onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                     onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                  >
                     <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ArrowLeft size={14} />
                     </div>
                     <span>My Courses</span>
                  </button>

                  {/* Course identity */}
                  <div style={{ marginBottom: '1.5rem' }}>
                     <div style={{ fontSize: '0.65rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.3rem' }}>Active Course</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-outfit)' }}>{activeCourse?.name}</div>
                     <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>{activeCourse?.section}</div>
                  </div>

            {/* ── TACTICAL SQUAD MODULE ── */}
            {myGroup ? (
              <div className="animate-fade-in-up" style={{ 
                background: 'rgba(255,255,255,0.015)', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '24px', 
                padding: '1.5rem', 
                marginBottom: '1.5rem', 
                position: 'relative', 
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
              }}>
                {/* Background Radar sweep decoration */}
                <div className="orbit-ring-1" style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '50%', pointerEvents: 'none' }} />
                
                {/* Identity Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
                  {/* Operator Core - Holographic Initials */}
                  <div style={{ 
                    width: '48px', height: '48px', 
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))', 
                    border: '1px solid rgba(139,92,246,0.25)', 
                    borderRadius: '14px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', flexShrink: 0
                  }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#c4b5fd', fontFamily: 'var(--font-outfit)' }}>
                      {profile?.full_name?.split(' ').map((n: any) => n[0]).join('').toUpperCase() || 'ST'}
                    </span>
                    <div className="confirm-core-glow" style={{ position: 'absolute', inset: '-2px', borderRadius: '16px', border: '1px solid rgba(139,92,246,0.1)', opacity: 0.5 }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.2rem' }}>Student Profile</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-outfit)', letterSpacing: '-0.01em', lineHeight: 1.2, wordBreak: 'break-word' }}>
                      {profile?.full_name || 'Student'}
                    </div>
                    {profile?.roll_number ? (
                      <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 800, marginTop: '0.15rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                         {formatFullRollNumber(profile.roll_number)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.65rem', color: '#f43f5e', fontWeight: 700, marginTop: '0.15rem' }}>
                         ⚠️ Missing Roll Number
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Info Chip */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em' }}>Assigned Squad</div>
                    {isRenamingGroup ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <input
                           type="text"
                           value={tempGroupName}
                           onChange={e => setTempGroupName(e.target.value)}
                           style={{
                              background: 'rgba(0,0,0,0.5)',
                              border: '1px solid #34d399',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.4rem',
                              width: '120px',
                              outline: 'none',
                              fontFamily: 'var(--font-outfit)'
                           }}
                           autoFocus
                           onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameGroup();
                              if (e.key === 'Escape') setIsRenamingGroup(false);
                           }}
                        />
                        <button onClick={handleRenameGroup} style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', padding: '0.1rem', display: 'flex', alignItems: 'center' }}><Check size={14} /></button>
                        <button onClick={() => setIsRenamingGroup(false)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.1rem', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#34d399', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myGroup.name}</div>
                        {myGroup.leader_id === user.id && (
                           <button onClick={() => { setIsRenamingGroup(true); setTempGroupName(myGroup.name); }} 
                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.color = '#34d399'}
                              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                              title="Rename Team"
                           >
                              <Pencil size={12} />
                           </button>
                        )}
                      </div>
                    )}
                  </div>
                  {myGroup.leader_id === user.id ? (
                    <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.6rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase' }}>Leader</div>
                  ) : (
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Member</div>
                  )}
                </div>

                {/* Tactical Status & Capacity */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                      <div className="confirm-core-glow" style={{ width: '6px', height: '6px', borderRadius: '50%', background: bookedSlot ? '#34d399' : '#fbbf24', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bookedSlot ? 'Slot Secured' : 'Awaiting Booking'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 800, opacity: 0.8, flexShrink: 0 }}>{myGroup.members}/{activeProject?.max_group_size || 5} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: '0.6rem' }}>PERS.</span></span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${(myGroup.members / (activeProject?.max_group_size || 5)) * 100}%`, 
                      background: 'linear-gradient(90deg, #34d399, #059669)', 
                      borderRadius: '100px', 
                      boxShadow: '0 0 8px rgba(52,211,153,0.3)' 
                    }} />
                  </div>
                </div>

                {/* Squad Members List */}
                {myGroupMembers && myGroupMembers.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Squad Roster</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {myGroupMembers.map((member: any) => {
                        const isLeader = member.id === myGroup.leader_id;
                        const isMe = member.id === user.id;
                        return (
                          <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: isMe ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isLeader ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isLeader ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: isLeader ? '#fbbf24' : 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                              {member.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isMe ? 700 : 500 }}>
                              {member.full_name} {isMe && '(You)'}
                            </span>
                            {isLeader && (
                              <span style={{ fontSize: '0.55rem', color: '#fbbf24', marginLeft: 'auto', fontWeight: 800 }}>LDR</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tactical Actions Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px', gap: '0.4rem' }}>
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(255,255,255,0.04)', 
                    padding: '0.5rem 0.75rem', 
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}>
                    <Hash size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>{myGroup.invite_code}</span>
                  </div>

                  <button onClick={handleCopyCode} style={{ 
                    background: codeCopied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    borderRadius: '10px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: codeCopied ? '#34d399' : 'rgba(255,255,255,0.35)', transition: 'all 0.2s' 
                  }}>
                    {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>

                  <button onClick={handleLeaveGroup} title="Withdraw Squad" style={{ 
                    background: 'rgba(244,63,94,0.03)', 
                    border: '1px solid rgba(244,63,94,0.1)', 
                    borderRadius: '10px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(244,63,94,0.35)', transition: 'all 0.2s' 
                  }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; e.currentTarget.style.color = '#f43f5e'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.03)'; e.currentTarget.style.color = 'rgba(244,63,94,0.35)'; }}>
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            ) : (
                     <div style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#f43f5e', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                           <XOctagon size={14} /> No Team Yet
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Form or join a team to access the booking calendar.</div>
                     </div>
                  )}

                  {/* Assignment Switcher */}
                  {courseProjects.length > 1 && (
                     <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.75rem' }}>Switch Assignment</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                           {courseProjects.map(p => (
                              <button key={p.id} onClick={() => loadProjectData(p)}
                                 style={{ padding: '0.7rem 0.875rem', borderRadius: '10px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', background: activeProject?.id === p.id ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeProject?.id === p.id ? '#c4b5fd' : 'rgba(255,255,255,0.4)', border: activeProject?.id === p.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent' }}
                              >{p.title}</button>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            )}

            {/* Sign Out */}
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
               <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                  onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
               >
                  <LogOut size={14} /> Sign Out
               </button>
            </div>
         </aside>

         {/* ═══════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════ */}
         <main className="main-content">

            {/* ──────────────────────────────────────────────
            PORTAL VIEW: My Courses
            ────────────────────────────────────────────── */}
            {viewState === 'PORTAL' && (
               <div className="animate-fade-in-up">
                  <header style={{ marginBottom: '3.5rem' }}>
                     <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.4))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>My Courses</h1>
                     <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '1rem' }}>Enroll with a course code from your professor, then enter your workspace.</p>
                  </header>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>

                     {/* Join Course Card */}
                     <div style={{ padding: '2rem', borderRadius: '24px', background: 'rgba(52,211,153,0.02)', border: '2px dashed rgba(52,211,153,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '260px', transition: 'border-color 0.3s' }}
                        onMouseOver={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,211,153,0.5)'}
                        onMouseOut={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,211,153,0.2)'}
                     >
                        <form onSubmit={handleJoinCourse}>
                           <div style={{ background: 'rgba(52,211,153,0.1)', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: '1.25rem' }}>
                              <UserPlus size={24} />
                           </div>
                           <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem', color: '#fff' }}>Join a Course</h3>
                           <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.25rem' }}>Enter the code shared by your professor.</p>

                           <input type="text" placeholder="e.g. X8B2MY" value={joinCodeInput}
                              onChange={e => { setJoinCodeInput(e.target.value); setJoinError(''); }} required
                              style={{ width: '100%', padding: '0.875rem', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${joinError ? 'rgba(244,63,94,0.5)' : 'var(--card-border)'}`, borderRadius: '12px', color: '#fff', outline: 'none', textAlign: 'center', letterSpacing: '0.15em', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', transition: 'border-color 0.2s' }}
                           />
                           {joinError && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginBottom: '0.75rem', textAlign: 'center' }}>{joinError}</div>}
                           <button type="submit" style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #34d399, #059669)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 8px 20px rgba(52,211,153,0.25)', transition: 'all 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                           >Find & Join →</button>
                        </form>
                     </div>

                     {/* Enrolled Courses — Bloom Cards */}
                     {enrolledCourses.map((course, idx) => {
                        const hue = courseHues[idx % courseHues.length];
                        return (
                           <div key={course.id} onClick={() => enterWorkspace(course.id)}
                              style={{ padding: '2rem', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', minHeight: '260px', position: 'relative', overflow: 'hidden' }}
                              onMouseOver={e => {
                                 const el = e.currentTarget as HTMLDivElement;
                                 el.style.borderColor = hue;
                                 el.style.transform = 'translateY(-4px)';
                                 el.style.boxShadow = `0 20px 40px ${hue}20`;
                                 const bloom = el.querySelector('.course-bloom') as HTMLDivElement;
                                 if (bloom) bloom.style.opacity = '1';
                              }}
                              onMouseOut={e => {
                                 const el = e.currentTarget as HTMLDivElement;
                                 el.style.borderColor = 'var(--card-border)';
                                 el.style.transform = 'translateY(0)';
                                 el.style.boxShadow = 'none';
                                 const bloom = el.querySelector('.course-bloom') as HTMLDivElement;
                                 if (bloom) bloom.style.opacity = '0';
                              }}
                           >
                              {/* Bloom gradient */}
                              <div className="course-bloom" style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: `radial-gradient(circle, ${hue}20 0%, transparent 70%)`, opacity: 0, transition: 'opacity 0.4s', pointerEvents: 'none' }} />

                              <div style={{ marginBottom: 'auto' }}>
                                 <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: `${hue}15`, border: `1px solid ${hue}30`, borderRadius: '8px', padding: '0.3rem 0.75rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: hue, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{course.section}</span>
                                 </div>
                                 <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#fff', fontFamily: 'var(--font-outfit)' }}>{course.name}</h3>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                 <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Enter Workspace</span>
                                 <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${hue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hue }}>
                                    <ArrowRight size={16} />
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}

            {/* ──────────────────────────────────────────────
            WORKSPACE VIEW
            ────────────────────────────────────────────── */}
            {viewState === 'WORKSPACE' && activeCourse && (
               <div className="animate-fade-in-up">

                  {/* Scenario 0: Has group, but no project yet */}
                  {myGroup && !activeProject && (
                     <div style={{ maxWidth: '560px', margin: '6rem auto 0', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: '#34d399' }}>
                           <CheckCircle2 size={36} />
                        </div>
                        <h2 style={{ color: '#fff', fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>Squad Ready!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Your squad <strong>"{myGroup.name}"</strong> has been successfully formed.</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>Waiting for the professor to post assignments or slots. Check back soon!</p>
                     </div>
                  )}

                  {/* Scenario A: No group — Interactive Wizard */}
                  {!myGroup && (
                     <div style={{ maxWidth: '640px', margin: '3rem auto 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                           <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
                              <Users size={34} />
                           </div>
                           <h1 style={{ fontSize: '2.25rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-outfit)' }}>Join a Team</h1>
                           <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.75rem', fontSize: '1rem' }}>
                              You need a team for {activeProject ? <strong style={{ color: '#fff' }}>"{activeProject.title}"</strong> : 'this course'} before booking.
                           </p>
                        </div>

                        {/* Step: Choose */}
                        {groupStep === 'choose' && (
                           <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                              <button onClick={() => setGroupStep('create')}
                                 style={{ padding: '2.5rem 1.5rem', borderRadius: '24px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.25s' }}
                                 onMouseOver={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                 onMouseOut={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.05)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                              >
                                 <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--primary)' }}><Sparkles size={28} /></div>
                                 <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>Lead a Team</div>
                                 <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Create a new group and invite your classmates with a code.</div>
                              </button>

                              <button onClick={() => setGroupStep('join')}
                                 style={{ padding: '2.5rem 1.5rem', borderRadius: '24px', background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.25s' }}
                                 onMouseOver={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                 onMouseOut={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.04)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                              >
                                 <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#34d399' }}><ArrowRight size={28} /></div>
                                 <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>Join a Team</div>
                                 <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Enter the invite code your group leader shared with you.</div>
                              </button>
                           </div>
                        )}

                        {/* Step: Create */}
                        {groupStep === 'create' && (
                           <div className="animate-scale-in" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '24px', padding: '2.5rem' }}>
                              <button onClick={() => setGroupStep('choose')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 700 }}><ArrowLeft size={14} /> Back</button>
                              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Name Your Team</h3>
                              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>An invite code will be generated instantly for your teammates.</p>
                              <input type="text" placeholder="e.g. The Innovators" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                                 style={{ width: '100%', padding: '1rem 1.25rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', color: '#fff', outline: 'none', fontSize: '1.1rem', fontWeight: 800, transition: 'border-color 0.2s' }}
                                 onFocus={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'}
                                 onBlur={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'}
                              />
                              <button onClick={handleCreateGroup} disabled={groupLoading || !newGroupName}
                                 style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, var(--primary), #6d28d9)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '1rem', cursor: groupLoading || !newGroupName ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(139,92,246,0.25)', opacity: !newGroupName ? 0.5 : 1 }}
                              >{groupLoading ? 'Creating...' : '⚡ Create Team & Get Code'}</button>
                           </div>
                        )}

                        {/* Step: Join */}
                        {groupStep === 'join' && (
                           <div className="animate-scale-in" style={{ background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '24px', padding: '2.5rem' }}>
                              <button onClick={() => setGroupStep('choose')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 700 }}><ArrowLeft size={14} /> Back</button>
                              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Paste Invite Code</h3>
                              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>Ask your group leader for their unique 6-character code.</p>
                              <input type="text" placeholder="ABC123" value={groupInviteInput} onChange={e => setGroupInviteInput(e.target.value)}
                                 style={{ width: '100%', padding: '1rem 1.25rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '14px', color: '#fff', outline: 'none', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.3em', textAlign: 'center', textTransform: 'uppercase', fontFamily: 'monospace', transition: 'border-color 0.2s' }}
                                 onFocus={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'}
                                 onBlur={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)'}
                              />
                              <button onClick={handleJoinGroup} disabled={groupLoading || !groupInviteInput}
                                 style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #34d399, #059669)', color: '#000', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '1rem', cursor: groupLoading || !groupInviteInput ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(52,211,153,0.2)', opacity: !groupInviteInput ? 0.5 : 1 }}
                              >{groupLoading ? 'Verifying...' : '✓ Verify & Join'}</button>
                           </div>
                        )}
                     </div>
                  )}

                  {/* ── BOOKING CALENDAR VIEW (Only if Active Project & Group exists) ── */}
                  {myGroup && activeProject && (
                     <div className="animate-fade-in-up">
                        <header style={{ marginBottom: '2.5rem' }}>
                           <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', padding: '0.3rem 0.75rem', marginBottom: '1rem' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{activeProject?.title}</span>
                           </div>
                           <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.02em' }}>Booking Calendar</h1>
                           <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '1rem' }}>Secure one presentation slot for <strong style={{ color: '#fff' }}>{myGroup.name}</strong>.</p>
                        </header>

                        {/* No events yet */}
                        {events.length === 0 && (
                           <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--card-border)' }}>
                              <Hourglass size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '1.5rem' }} />
                              <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>Calendar Not Published Yet</h3>
                              <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto' }}>The professor hasn't generated the booking slots yet. Standby!</p>
                           </div>
                        )}

                        {/* All slots taken + not booked */}
                        {events.length > 0 && slots.filter(sl => sl.status === 'AVAILABLE').length === 0 && !bookedSlot && (
                           <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(244,63,94,0.03)', borderRadius: '24px', border: '1px dashed rgba(244,63,94,0.2)' }}>
                              <XOctagon size={48} style={{ color: '#f43f5e', marginBottom: '1.5rem', opacity: 0.8 }} />
                              <h3 style={{ color: '#fff', fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 900 }}>All Slots Taken</h3>
                              <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '420px', margin: '0 auto 2.5rem', fontSize: '1rem' }}>Every slot has been claimed. Join the standby waitlist to be promoted if one opens up.</p>
                              {myWaitlistEntry ? (
                                 <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '14px', padding: '1rem 1.75rem', color: '#c4b5fd', fontSize: '1rem', fontWeight: 800 }}>
                                    <Hourglass size={20} style={{ animation: 'spin 2s linear infinite' }} /> On Standby Waitlist
                                 </div>
                              ) : myGroup.leader_id === user.id ? (
                                 <button onClick={handleJoinWaitlist} disabled={bookingLoading}
                                    style={{ padding: '1rem 2.5rem', background: 'linear-gradient(135deg, var(--primary), #6d28d9)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(139,92,246,0.3)' }}>
                                    {bookingLoading ? <Hourglass size={20} /> : <><ListOrdered size={18} style={{ marginRight: '0.5rem' }} /> Join Standby Waitlist</>}
                                 </button>
                              ) : (
                                 <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Only the team leader can join the waitlist.</p>
                              )}
                           </div>
                        )}

                        {/* ── BOOKING CONFIRMATION SCREEN — ORBITAL PASS ── */}
                        {bookedSlot && bookedSlotEvent && (() => {
                           const slotDate = new Date(bookedSlotEvent.date + 'T00:00:00');
                           const today = new Date(); today.setHours(0, 0, 0, 0);
                           const daysAway = Math.round((slotDate.getTime() - today.getTime()) / 86400000);
                           const dayLabel = daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : daysAway < 0 ? `${Math.abs(daysAway)}d ago` : `In ${daysAway} days`;
                           const isUrgent = daysAway >= 0 && daysAway <= 2;
                           return (
                              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                 {/* TOP ROW: Pass + Orbit Column */}
                                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '1.5rem', alignItems: 'stretch' }}>

                                    {/* ══ MAIN HOLOGRAPHIC PASS ══ */}
                                    <div className="booking-pass-float" style={{ position: 'relative', borderRadius: '32px', overflow: 'hidden', background: 'linear-gradient(135deg, #0d0d18 0%, #110e1f 40%, #0a1215 100%)', border: '1px solid rgba(52,211,153,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.05), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

                                       {/* Shimmer sweep animation */}
                                       <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '32px', pointerEvents: 'none', zIndex: 0 }}>
                                          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '60%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', animation: 'shimmer-sweep 4s ease-in-out infinite', left: 0 }} />
                                       </div>

                                       {/* Top green accent bar */}
                                       <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent, #34d399, #34d39980, transparent)', zIndex: 2 }} />

                                       {/* Content layout */}
                                       <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'auto 1px 1fr', alignItems: 'stretch' }}>

                                          {/* LEFT: Orbital clock zone */}
                                          <div style={{ padding: '2.5rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', minWidth: '220px' }}>
                                             {/* Orbit rings */}
                                             <div style={{ position: 'absolute', inset: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                                <div className="orbit-ring-1" style={{ position: 'absolute', width: '170px', height: '170px', borderRadius: '50%', border: '1px solid rgba(52,211,153,0.12)', borderTopColor: 'rgba(52,211,153,0.5)', borderRightColor: 'rgba(52,211,153,0.08)' }} />
                                                <div className="orbit-ring-2" style={{ position: 'absolute', width: '130px', height: '130px', borderRadius: '50%', border: '1px solid rgba(139,92,246,0.1)', borderTopColor: 'transparent', borderLeftColor: 'rgba(139,92,246,0.4)' }} />
                                                <div className="confirm-core-glow" style={{ position: 'absolute', width: '90px', height: '90px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)' }} />
                                             </div>
                                             {/* Time display */}
                                             <div style={{ position: 'relative', textAlign: 'center' }}>
                                                <div style={{ fontSize: '3.25rem', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', fontFamily: 'var(--font-outfit)', textShadow: '0 0 40px rgba(52,211,153,0.25)' }}>
                                                   {bookedSlot.start_time.substring(0, 5)}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'rgba(52,211,153,0.6)', fontWeight: 700, marginTop: '0.4rem', letterSpacing: '0.05em' }}>
                                                   → {bookedSlot.end_time.substring(0, 5)}
                                                </div>
                                             </div>
                                          </div>

                                          {/* Perforated divider */}
                                          <div style={{ width: '1px', backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 6px, transparent 6px, transparent 12px)', margin: '1.5rem 0', position: 'relative' }}>
                                             {/* Notch cutouts - top and bottom */}
                                             <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--background)', border: '1px solid rgba(255,255,255,0.06)' }} />
                                             <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--background)', border: '1px solid rgba(255,255,255,0.06)' }} />
                                          </div>

                                          {/* RIGHT: Details */}
                                          <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                             {/* Header row */}
                                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                                                <div>
                                                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
                                                      <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Confirmed</span>
                                                   </div>
                                                   <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>
                                                      {slotDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                                   </div>
                                                   <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: '0.15rem' }}>
                                                      {slotDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                   </div>
                                                </div>
                                                <div style={{ background: isUrgent ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isUrgent ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '0.6rem 1rem', textAlign: 'center', minWidth: '72px' }}>
                                                   <div style={{ fontSize: '1.3rem', fontWeight: 900, color: isUrgent ? '#fbbf24' : '#fff', fontFamily: 'var(--font-outfit)', lineHeight: 1 }}>{Math.abs(daysAway)}</div>
                                                   <div style={{ fontSize: '0.6rem', color: isUrgent ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>{daysAway < 0 ? 'days ago' : daysAway === 0 ? 'today!' : 'days left'}</div>
                                                </div>
                                             </div>
                                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem', marginBottom: '1.75rem' }}>
                                                {[
                                                   { label: 'Team', value: myGroup.name },
                                                   { label: 'Assignment', value: activeProject?.title },
                                                   { label: 'Course', value: activeCourse?.name },
                                                   { label: 'Section', value: activeCourse?.section },
                                                ].map(({ label, value }) => (
                                                   <div key={label}>
                                                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.2rem' }}>{label}</div>
                                                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                                                   </div>
                                                ))}
                                             </div>
                                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: daysAway < 0 ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)', border: `1px solid ${daysAway < 0 ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)'}`, borderRadius: '10px', padding: '0.5rem 0.875rem' }}>
                                                   <Shield size={13} style={{ color: daysAway < 0 ? '#fbbf24' : '#34d399' }} />
                                                   <span style={{ fontSize: '0.75rem', color: daysAway < 0 ? '#fbbf24' : '#34d399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{daysAway < 0 ? 'Past Review (Locked)' : 'Slot Locked'}</span>
                                                </div>
                                                {myGroup.leader_id === user.id && (
                                                   <button onClick={handleCancelBooking}
                                                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'rgba(244,63,94,0.45)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'color 0.2s', padding: '0.25rem' }}
                                                      onMouseOver={e => e.currentTarget.style.color = '#f43f5e'}
                                                      onMouseOut={e => e.currentTarget.style.color = 'rgba(244,63,94,0.45)'}
                                                   >
                                                      <RotateCcw size={13} /> Reschedule
                                                   </button>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                       <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '1.75rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                          <div style={{ position: 'absolute', inset: 0, background: isUrgent ? 'radial-gradient(circle at 50% 100%, rgba(251,191,36,0.04) 0%, transparent 60%)' : 'none', pointerEvents: 'none' }} />
                                          <svg width="100" height="100" viewBox="0 0 100 100" style={{ marginBottom: '0.75rem' }}>
                                             <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                                             <circle cx="50" cy="50" r="42" fill="none"
                                                stroke={isUrgent ? '#fbbf24' : '#34d399'}
                                                strokeWidth="5" strokeLinecap="round"
                                                strokeDasharray={`${Math.max(5, Math.min(100, (1 - daysAway / 30) * 264))} 264`}
                                                strokeDashoffset="66"
                                                style={{ filter: `drop-shadow(0 0 6px ${isUrgent ? '#fbbf24' : '#34d399'})`, transition: 'stroke-dasharray 1s ease' }}
                                             />
                                             <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="900" fontFamily="Outfit, sans-serif">{Math.max(0, daysAway)}</text>
                                             <text x="50" y="60" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="700" fontFamily="Outfit, sans-serif">DAYS</text>
                                          </svg>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isUrgent ? '#fbbf24' : 'rgba(255,255,255,0.7)' }}>{dayLabel}</div>
                                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem' }}>until presentation</div>
                                       </div>
                                       {/* Quick stat */}
                                       <div style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)', borderRadius: '18px', padding: '1.25rem', textAlign: 'center' }}>
                                          <div style={{ fontSize: '0.65rem', color: 'rgba(52,211,153,0.5)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Duration</div>
                                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-outfit)' }}>
                                             {(() => {
                                                const [sh, sm] = bookedSlot.start_time.split(':').map(Number);
                                                const [eh, em] = bookedSlot.end_time.split(':').map(Number);
                                                const mins = (eh * 60 + em) - (sh * 60 + sm);
                                                return `${mins}m`;
                                             })()}
                                          </div>
                                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.1rem' }}>presentation window</div>
                                       </div>
                                    </div>
                                 </div>

                                 {/* ══ BOTTOM ROW: Upload Review Documents Section ══ */}
                                 <div style={{ background: 'linear-gradient(145deg, rgba(20, 20, 30, 0.6), rgba(15, 15, 22, 0.8))', border: '1px solid rgba(139,92,246,0.18)', borderRadius: '28px', padding: '2rem 2.25rem', backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                       <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                             <FolderUp size={16} style={{ color: 'var(--primary)' }} />
                                             <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Review Submission</span>
                                          </div>
                                          <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'var(--font-outfit)' }}>Upload Review Documents</h3>
                                          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', margin: '0.2rem 0 0 0' }}>Attach code files, notebook (.ipynb), PDF report, or GitHub links for your evaluation.</p>
                                       </div>

                                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.ipynb,.py,.zip,.docx,.txt" />
                                          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                                             style={{ padding: '0.7rem 1.25rem', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', color: '#c4b5fd', fontWeight: 800, fontSize: '0.85rem', cursor: uploadingFile ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                             onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.25)'}
                                             onMouseOut={e => e.currentTarget.style.background = 'rgba(139,92,246,0.15)'}
                                          >
                                             {uploadingFile ? <Hourglass size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                                             {uploadingFile ? 'Uploading...' : 'Upload File'}
                                          </button>

                                          <button onClick={() => setShowLinkModal(true)}
                                             style={{ padding: '0.7rem 1.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                             onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                             onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                          >
                                             <LinkIcon size={14} /> Add Link
                                          </button>
                                       </div>
                                    </div>

                                    {/* Submitted files list */}
                                    {submissionFiles.length === 0 ? (
                                       <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                          <FileText size={32} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '0.75rem' }} />
                                          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>No documents attached yet</div>
                                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>Upload your project slides, code repositories, or reports before presentation time.</div>
                                       </div>
                                    ) : (
                                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                          {submissionFiles.map((file) => (
                                             <div key={file.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                   <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: file.file_type === 'link' ? 'rgba(52,211,153,0.12)' : 'rgba(139,92,246,0.12)', border: file.file_type === 'link' ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: file.file_type === 'link' ? '#34d399' : '#c4b5fd', flexShrink: 0 }}>
                                                      {file.file_type === 'link' ? <LinkIcon size={18} /> : <FileText size={18} />}
                                                   </div>
                                                   <div style={{ overflow: 'hidden' }}>
                                                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
                                                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem' }}>{file.student_name ? `by ${file.student_name}` : file.file_type}</div>
                                                   </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                                   <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                                                      <ExternalLink size={14} />
                                                   </a>
                                                   <button onClick={() => handleDeleteSubmissionFile(file.id)} style={{ background: 'rgba(244,63,94,0.08)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', cursor: 'pointer' }}>
                                                      <Trash2 size={14} />
                                                   </button>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           );
                        })()}

                        {/* ── TIME BLOCK BOARD ── main slot view */}
                        {events.length > 0 && !bookedSlot && slots.filter(sl => sl.status === 'AVAILABLE').length > 0 && (
                           <div className="two-col-grid">

                              <div>
                                 <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.75rem' }}>Select Day</div>
                                 <div className="date-strip">
                                 {events.map((ev) => {
                                     const d = new Date(ev.date + 'T00:00:00');
                                     const isActive = activeDate === ev.date;
                                     const todayStr = new Date().toISOString().split('T')[0];
                                     const isPast = ev.date < todayStr;
                                     const slotsOnDay = slots.filter(s => events.find(e => e.id === s.event_id)?.date === ev.date);
                                     const availableCount = slotsOnDay.filter(s => s.status === 'AVAILABLE').length;
                                     return (
                                        <button key={ev.id} onClick={() => { setActiveDate(ev.date); setSelectedSlot(null); }}
                                           style={{
                                              padding: '0.875rem 0.75rem', borderRadius: '18px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                                              width: '90px', minWidth: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                              background: isActive ? (isPast ? 'linear-gradient(135deg, #d97706, #b45309)' : 'linear-gradient(135deg, var(--primary), #6d28d9)') : (isPast ? 'rgba(251,191,36,0.04)' : 'rgba(255,255,255,0.03)'),
                                              border: `1px solid ${isActive ? 'transparent' : isPast ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)'}`,
                                              boxShadow: isActive ? (isPast ? '0 8px 20px rgba(217,119,6,0.35)' : '0 8px 20px rgba(139,92,246,0.35)') : 'none',
                                              transform: isActive ? 'scale(1.04)' : 'scale(1)',
                                           }}
                                        >
                                           <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: isActive ? 'rgba(255,255,255,0.8)' : isPast ? '#fbbf24' : 'rgba(255,255,255,0.3)', marginBottom: '0.2rem' }}>
                                              {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                           </div>
                                           <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-outfit)' }}>{d.getDate()}</div>
                                           <div style={{ fontSize: '0.65rem', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', marginTop: '0.3rem' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                                           {isPast ? (
                                              <div style={{ marginTop: '0.5rem', background: isActive ? 'rgba(0,0,0,0.25)' : 'rgba(251,191,36,0.12)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.62rem', color: isActive ? '#fff' : '#fbbf24', fontWeight: 800 }}>Passed</div>
                                           ) : availableCount > 0 ? (
                                              <div style={{ marginTop: '0.5rem', background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(52,211,153,0.15)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', color: isActive ? '#fff' : '#34d399', fontWeight: 800 }}>{availableCount} open</div>
                                           ) : null}
                                        </button>
                                     );
                                  })}
                                 </div>
                              </div>

                              {/* Time Block Board */}
                              <div>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em' }}>Available Slots</div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#34d399' }} /><span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Available</span></div>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)' }} /><span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Selected</span></div>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(244,63,94,0.5)' }} /><span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Taken</span></div>
                                    </div>
                                 </div>

                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {(() => {
                                       const todayStr = new Date().toISOString().split('T')[0];
                                       const isPastDate = activeDate ? activeDate < todayStr : false;
                                       const filteredSlots = slots.filter(s => events.find(e => e.id === s.event_id)?.date === activeDate);

                                       return (
                                          <>
                                             {isPastDate && (
                                                <div className="animate-fade-in" style={{
                                                   background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.03))',
                                                   border: '1px solid rgba(251,191,36,0.28)',
                                                   borderLeft: '4px solid #fbbf24',
                                                   borderRadius: '18px',
                                                   padding: '1.25rem 1.5rem',
                                                   marginBottom: '1.25rem',
                                                   backdropFilter: 'blur(16px)',
                                                   boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                                                   display: 'flex',
                                                   alignItems: 'center',
                                                   gap: '1.25rem'
                                                }}>
                                                   <div style={{
                                                      background: 'rgba(251,191,36,0.15)',
                                                      border: '1px solid rgba(251,191,36,0.3)',
                                                      width: '46px', height: '46px',
                                                      borderRadius: '16px',
                                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                      color: '#fbbf24', flexShrink: 0,
                                                      boxShadow: '0 0 20px rgba(251,191,36,0.2)'
                                                   }}>
                                                      <History size={24} />
                                                   </div>
                                                   <div style={{ flex: 1 }}>
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                                                         <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', background: 'rgba(251,191,36,0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.25)' }}>
                                                            Past Review Milestone
                                                         </span>
                                                         <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
                                                            {new Date(activeDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                         </span>
                                                      </div>
                                                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                                                         This review date has passed. Slot locking and changes for past dates are archived.
                                                      </div>
                                                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.25rem', fontWeight: 500 }}>
                                                         Select an active upcoming date from the calendar strip on the left to lock a new review slot.
                                                      </div>
                                                   </div>
                                                </div>
                                             )}
                                             {filteredSlots.length === 0 && (
                                                <div style={{ color: 'rgba(255,255,255,0.3)', padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', fontSize: '0.9rem' }}>No slots for this date.</div>
                                             )}
                                             {filteredSlots.map((slot) => {
                                                const isAvailable = slot.status === 'AVAILABLE';
                                                const isBookedByOthers = !isAvailable && slot.group_id !== myGroup?.id;
                                                const isLeader = myGroup?.leader_id === user.id;
                                                const isSelected = selectedSlot === slot.id;
                                                const myCurrentBooking = slots.find(sl => sl.group_id === myGroup?.id);
                                                const canSelect = isAvailable && isLeader && !isPastDate && slot.id !== myCurrentBooking?.id;

                                                let leftBorder = 'rgba(255,255,255,0.06)';
                                                let bg = 'rgba(255,255,255,0.02)';
                                                if (isBookedByOthers) { leftBorder = 'rgba(244,63,94,0.4)'; bg = 'rgba(244,63,94,0.03)'; }
                                                else if (isPastDate) { leftBorder = 'rgba(251,191,36,0.2)'; bg = 'rgba(251,191,36,0.02)'; }
                                                else if (isSelected) { leftBorder = 'var(--primary)'; bg = 'rgba(139,92,246,0.08)'; }
                                                else if (isAvailable && !isSelected) { leftBorder = 'rgba(52,211,153,0.3)'; }

                                                return (
                                                   <div key={slot.id}
                                                      onClick={() => { if (canSelect) setSelectedSlot(isSelected ? null : slot.id); }}
                                                      style={{
                                                         display: 'flex', alignItems: 'center', gap: '1.25rem',
                                                         padding: '1rem 1.5rem', borderRadius: '14px',
                                                         background: bg,
                                                         border: '1px solid rgba(255,255,255,0.04)',
                                                         borderLeft: `3px solid ${leftBorder}`,
                                                         cursor: canSelect ? 'pointer' : 'not-allowed',
                                                         opacity: isPastDate ? 0.45 : isBookedByOthers ? 0.85 : 1,
                                                         transition: 'all 0.18s',
                                                         transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                                                      }}
                                                      onMouseOver={e => { if (canSelect) e.currentTarget.style.background = isSelected ? bg : 'rgba(255,255,255,0.04)'; }}
                                                      onMouseOut={e => { e.currentTarget.style.background = bg; }}
                                                   >
                                                      {/* Time */}
                                                      <div style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.5rem', fontWeight: 900, color: isSelected ? '#fff' : isBookedByOthers ? 'rgba(255,255,255,0.85)' : isPastDate ? 'rgba(255,255,255,0.3)' : '#fff', minWidth: '75px', lineHeight: 1 }}>
                                                         {slot.start_time.substring(0, 5)}
                                                      </div>

                                                      {/* Duration pill */}
                                                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>→ {slot.end_time.substring(0, 5)}</div>

                                                      {/* Spacer */}
                                                      <div style={{ flex: 1 }} />

                                                      {/* Status badge */}
                                                      {isBookedByOthers ? (
                                                         <div 
                                                            title={`Public Reservation: Booked by ${slot.groups?.name || 'Group'}`}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', padding: '0.35rem 0.85rem', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 800 }}
                                                         >
                                                            <Users size={13} style={{ color: '#f43f5e', flexShrink: 0 }} />
                                                            <span>Booked by <strong style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{slot.groups?.name || 'Group'}</strong></span>
                                                         </div>
                                                      ) : isPastDate ? (
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', padding: '0.3rem 0.75rem', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                            <History size={10} /> Archived
                                                         </div>
                                                      ) : isSelected ? (
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', padding: '0.3rem 0.75rem', color: '#c4b5fd', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                            <CheckCircle2 size={10} /> Selected
                                                         </div>
                                                      ) : (
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', padding: '0.3rem 0.75rem', color: '#34d399', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                            Open
                                                         </div>
                                                      )}
                                                   </div>
                                                );
                                             })}
                                          </>
                                       );
                                    })()}
                                  </div>

                                  {/* Lock Slot CTA inside Right Column */}
                                  {selectedSlot && myGroup.leader_id === user.id && (() => {
                                     const hasBooking = slots.some(sl => sl.group_id === myGroup.id);
                                     return (
                                        <div className="animate-scale-in" style={{ marginTop: '1.25rem', padding: '1.25rem 1.5rem', background: 'linear-gradient(145deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                                           <div>
                                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '0.2rem' }}>{hasBooking ? 'Need to reschedule?' : 'Ready to commit?'}</div>
                                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{hasBooking ? 'Release old slot and book this one' : `Lock in this slot for ${myGroup.name}`}</div>
                                           </div>
                                           <button onClick={handleBookSlot} disabled={bookingLoading}
                                              style={{ padding: '0.75rem 1.75rem', background: 'linear-gradient(135deg, var(--primary), #6d28d9)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(139,92,246,0.35)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                           >
                                              {bookingLoading ? <Hourglass size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={15} />}
                                              {bookingLoading ? 'Securing...' : hasBooking ? 'Reschedule Slot' : 'Lock Slot'}
                                           </button>
                                        </div>
                                     );
                                  })()}

                                 {selectedSlot && myGroup.leader_id !== user.id && (
                                    <div style={{ marginTop: '1.5rem', padding: '1rem 1.5rem', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 700 }}>
                                       <Lock size={14} /> Only the group leader can confirm a booking.
                                    </div>
                                 )}
                              </div>
                           </div>
                        )}
                     </div>
                  )}
               </div>
            )}
         </main>

         {/* ═══════════════════════════════════════════════
          EDIT PROFILE / ROLL NUMBER MODAL
          ═══════════════════════════════════════════════ */}
         {editProfileOpen && (() => {
            const parsed = parseAmritaRollNumber(editRollInput);
            return (
               <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '2rem' }}>
                  <div className="animate-scale-in" style={{ background: 'linear-gradient(145deg, rgba(30,30,40,0.97), rgba(20,20,25,0.99))', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '32px', maxWidth: '440px', width: '100%', padding: '2.5rem', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.3rem' }}>Account Profile</div>
                           <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'var(--font-outfit)' }}>{profile?.roll_number ? 'Update Profile' : 'Complete Registration'}</h2>
                        </div>
                        {profile?.roll_number && (
                           <button onClick={() => setEditProfileOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={16} /></button>
                        )}
                     </div>

                     <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
                        Your full name and roll number are required for your professor's class roster.
                     </p>

                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                        <div>
                           <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: '0.4rem' }}>Full Name</label>
                           <input type="text" value={editNameInput} onChange={e => setEditNameInput(e.target.value)} placeholder="John Doe"
                              style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '1rem', fontWeight: 700 }}
                           />
                        </div>

                        <div>
                           <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: '0.4rem' }}>Roll Number (e.g. CB.SC.U4AIE24213)</label>
                           <input type="text" value={editRollInput} onChange={e => setEditRollInput(e.target.value)} placeholder="e.g. U4AIE24213"
                              style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase' }}
                           />
                        </div>

                        {/* Live Parse Preview Badge */}
                        {editRollInput.trim() && (
                           <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <div style={{ fontSize: '0.65rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em' }}>Parsed Credentials</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                                 <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Section: </span><strong style={{ color: '#fff' }}>{parsed.section}</strong></div>
                                 <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Department: </span><strong style={{ color: '#fff' }}>{parsed.dept || 'General'}</strong></div>
                              </div>
                           </div>
                        )}
                     </div>

                     <button onClick={handleSaveProfile} disabled={editProfileSaving || !editNameInput.trim() || !editRollInput.trim()}
                        style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, var(--primary), #6d28d9)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '1rem', cursor: editProfileSaving || !editNameInput.trim() || !editRollInput.trim() ? 'not-allowed' : 'pointer', opacity: !editNameInput.trim() || !editRollInput.trim() ? 0.5 : 1, boxShadow: '0 8px 20px rgba(139,92,246,0.3)' }}
                     >{editProfileSaving ? 'Saving Profile...' : 'Save Profile Credentials'}</button>
                  </div>
               </div>
            );
         })()}

          {/* =========================================================
              CONFIRMATION MODAL (RESCHEDULE / WITHDRAW SQUAD)
              ========================================================= */}
          {confirmModal?.isOpen && (
             <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '2rem' }}>
                <div className="animate-scale-in" style={{ background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 25, 0.98))', border: `1px solid ${confirmModal.danger ? 'rgba(244,63,94,0.3)' : 'rgba(139,92,246,0.3)'}`, borderRadius: '32px', width: '100%', maxWidth: '440px', padding: '2.5rem', position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                   <div style={{ background: confirmModal.danger ? 'rgba(244, 63, 94, 0.1)' : 'rgba(139, 92, 246, 0.1)', width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: confirmModal.danger ? '#f43f5e' : '#c4b5fd', marginBottom: '1.5rem' }}>
                      {confirmModal.danger ? <XOctagon size={28} /> : <RotateCcw size={28} />}
                   </div>
                   
                   <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em', fontFamily: 'var(--font-outfit)' }}>{confirmModal.title}</h2>
                   <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: '1.5', marginBottom: '2rem' }}>{confirmModal.message}</p>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button 
                         onClick={() => setConfirmModal(null)}
                         style={{ padding: '0.875rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                         onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                         onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                         Cancel
                      </button>
                      <button 
                         onClick={() => confirmModal.onConfirm()}
                         style={{ padding: '0.875rem', borderRadius: '14px', border: 'none', background: confirmModal.danger ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'linear-gradient(135deg, var(--primary), #6d28d9)', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: confirmModal.danger ? '0 8px 16px rgba(244, 63, 94, 0.2)' : '0 8px 16px rgba(139, 92, 246, 0.2)', transition: 'all 0.2s' }}
                         onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                         onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                         {confirmModal.confirmLabel || 'Confirm'}
                      </button>
                   </div>
                 </div>
              </div>
           )}

          {/* =========================================================
              ADD REPOSITORY / DEMO LINK MODAL
              ========================================================= */}
          {showLinkModal && (
             <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '2rem' }}>
                <div className="animate-scale-in" style={{ background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 25, 0.98))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '32px', width: '100%', maxWidth: '440px', padding: '2.5rem', position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                         <div style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.3rem' }}>Upload Review Documents</div>
                         <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'var(--font-outfit)' }}>Add Repository Link</h2>
                      </div>
                      <button onClick={() => setShowLinkModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={16} /></button>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                      <div>
                         <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: '0.4rem' }}>Link Title (e.g. GitHub Repository, Live Demo)</label>
                         <input type="text" value={linkTitleInput} onChange={e => setLinkTitleInput(e.target.value)} placeholder="GitHub Repository"
                            style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '0.95rem', fontWeight: 700 }}
                         />
                      </div>

                      <div>
                         <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: '0.4rem' }}>URL Address</label>
                         <input type="url" value={linkUrlInput} onChange={e => setLinkUrlInput(e.target.value)} placeholder="https://github.com/user/project"
                            style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '0.95rem', fontWeight: 700 }}
                         />
                      </div>
                   </div>

                   <button onClick={handleAttachLink} disabled={!linkTitleInput.trim() || !linkUrlInput.trim()}
                      style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, var(--primary), #6d28d9)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '1rem', cursor: !linkTitleInput.trim() || !linkUrlInput.trim() ? 'not-allowed' : 'pointer', opacity: !linkTitleInput.trim() || !linkUrlInput.trim() ? 0.5 : 1, boxShadow: '0 8px 20px rgba(139,92,246,0.3)' }}
                   >Attach Repository Link</button>
                </div>
             </div>
          )}
       </div>
    );
 }