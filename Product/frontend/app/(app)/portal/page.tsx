"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useElementInView } from "@/hooks/use-scroll-progress";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Activity, Brain, ChevronRight, Calendar, Shield, Plus, X, FileText, Trash2, Lightbulb, AlertTriangle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function PortalPage() {
  const ref = useRef<HTMLDivElement>(null);
  const { hasBeenInView } = useElementInView(ref, { threshold: 0.1 });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShareKey, setNewShareKey] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [expandedAssessment, setExpandedAssessment] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchStudents = async () => {
    try {
      const json = await api.get("/portal/students");
      setData(json);
    } catch (err) {
      console.error("Failed to fetch portal data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddPatient = async () => {
    if (!newShareKey) return;
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const json = await api.post("/portal/link-student", { share_key: newShareKey });
      setAddSuccess(json.message);
      setNewShareKey("");
      // Refresh list after short delay
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess(null);
        fetchStudents();
      }, 1500);
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleUnlinkPatient = async (e: React.MouseEvent, studentId: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this patient? They will no longer appear in your portal.")) return;
    
    setIsDeleting(studentId);
    try {
      await api.post(`/portal/unlink-student/${studentId}`, {});
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
        setStudentDetail(null);
      }
      fetchStudents();
    } catch (err: any) {
      alert("Failed to remove patient: " + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const fetchStudentDetail = async (studentId: number) => {
    try {
      const json = await api.get(`/portal/student/${studentId}/summary`);
      setStudentDetail(json);
    } catch (err) {
      console.error("Failed to fetch student detail", err);
    }
  };

  if (loading) return <div className="text-center py-10">Loading portal...</div>;

  const students = data?.students || [];
  const role = data?.role || "student";

  const levelColors: Record<string, string> = {
    stage_1: "bg-blue-100 text-blue-700",
    stage_2: "bg-orange-100 text-orange-700",
    stage_3: "bg-red-100 text-red-700",
  };

  if (role === "student") {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-6 animate-fade-in-up">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-50 flex items-center justify-center border border-red-100">
          <Shield className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground text-lg">
          The Student Portal is reserved for Parents, Teachers, and Medical Professionals.
        </p>
        <Button onClick={() => window.location.href = '/dashboard'} size="lg" className="rounded-xl px-8 mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div ref={ref} className="max-w-4xl mx-auto space-y-6 pb-20 relative">
      <div className={cn("opacity-0 flex items-center justify-between", hasBeenInView && "animate-fade-in-up")}>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"
            style={{ fontFamily: "var(--font-fredoka)" }}>
            <Users className="w-7 h-7 text-primary" />
            Patient Portal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor patient progress, training statistics, and diagnostic reports.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Patient
        </Button>
      </div>

      {/* Role badge */}
      <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
        <Shield className="w-4 h-4" />
        Role: {role.charAt(0).toUpperCase() + role.slice(1)}
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {students.map((student: any) => (
          <div key={student.id}
            className={cn(
              "bg-card rounded-3xl border p-6 shadow-sm transition-all cursor-pointer hover:shadow-lg relative group",
              selectedStudent?.id === student.id ? "ring-2 ring-primary border-transparent" : "hover:-translate-y-1"
            )}
            onClick={() => {
              setSelectedStudent(student);
              fetchStudentDetail(student.id);
            }}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary font-fredoka text-2xl font-bold">
                {(student.name || "P").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-lg truncate">{student.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                
                <div className="flex flex-wrap gap-3 mt-3">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <BookOpen className="w-3 h-3 text-primary" /> {student.total_assessments}
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <Activity className="w-3 h-3 text-emerald-500" /> {student.training_completed}
                   </div>
                </div>
              </div>
              
              <button 
                onClick={(e) => handleUnlinkPatient(e, student.id)}
                disabled={isDeleting === student.id}
                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                {isDeleting === student.id ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>

            {student.latest_assessment && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Latest Risk</p>
                   <span className={cn(
                     "text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide",
                     levelColors[student.latest_assessment.level] || "bg-emerald-50 text-emerald-600"
                   )}>
                     {student.latest_assessment.prediction || "Normal"}
                   </span>
                </div>
                <div className="text-right">
                   <p className="text-xs font-bold text-foreground">{student.latest_assessment.confidence}%</p>
                   <p className="text-[10px] font-medium text-muted-foreground">Confidence</p>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronRight className="w-5 h-5 text-primary" />
            </div>
          </div>
        ))}
        
        {/* ➕ Add Patient Tile */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-dashed border-2 border-dashed border-primary/20 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/40 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
             <Plus className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
             <p className="font-bold text-primary">Link More Patients</p>
             <p className="text-xs text-muted-foreground font-medium">Add a new student using their share key</p>
          </div>
        </button>
      </div>

      {/* Student Detail Panel */}
      {studentDetail && (
        <div className="bg-card rounded-3xl border p-8 shadow-sm animate-fade-in-up space-y-8 mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-fredoka font-bold text-2xl text-foreground flex items-center gap-3">
              <Brain className="w-6 h-6 text-violet-500" />
              Patient Summary - {selectedStudent?.name}
            </h3>
            <Button 
              onClick={() => window.location.href = `/reports/full?student_id=${selectedStudent.id}`}
              className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              <FileText className="w-4 h-4 mr-2" /> Medical History Report
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Assessments", val: studentDetail.training?.total_exercises || 0, color: "text-blue-500" },
              { label: "Completed", val: studentDetail.training?.completed || 0, color: "text-emerald-500" },
              { label: "Rate", val: `${studentDetail.training?.completion_rate || 0}%`, color: "text-violet-500" },
              { label: "Total XP", val: studentDetail.training?.total_xp || 0, color: "text-amber-500" }
            ].map((stat, i) => (
              <div key={i} className="bg-secondary/20 rounded-2xl p-4 text-center">
                <p className={cn("text-2xl font-bold font-fredoka", stat.color)}>{stat.val}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Error Patterns */}
          {studentDetail.error_patterns && Object.keys(studentDetail.error_patterns).length > 0 && (
            <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6">
              <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Cognitive Pattern Identification
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(studentDetail.error_patterns).map(([type, count]: [string, any]) => (
                  <span key={type} className="px-4 py-2 bg-white text-red-600 rounded-xl text-xs font-black uppercase tracking-widest border border-red-200 shadow-sm">
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Assessments */}
          {studentDetail.assessments?.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-foreground text-lg mb-2 pl-1">Diagnostic Timeline</h4>
              <div className="space-y-3">
                {studentDetail.assessments.map((a: any, i: number) => {
                  const isExpanded = expandedAssessment === i;
                  return (
                    <div key={i} className="group">
                      <div 
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border",
                          isExpanded ? "bg-white shadow-md border-primary ring-1 ring-primary/20" : "bg-secondary/10 border-transparent hover:bg-secondary/20"
                        )}
                        onClick={() => setExpandedAssessment(isExpanded ? null : i)}
                      >
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                           <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{a.prediction}</span>
                              <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{a.confidence}% Confidence</span>
                           </div>
                           <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                              {a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "—"}
                           </p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right hidden sm:block">
                              <p className="text-xs font-bold text-red-600">Dyslexia Index: {a.dyslexia_risk}%</p>
                              <p className="text-xs font-bold text-amber-600">Dysgraphia Index: {a.dysgraphia_risk}%</p>
                           </div>
                           <ChevronRight className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-90")} />
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="bg-white border rounded-2xl p-6 mt-3 mx-2 space-y-6 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center justify-between">
                             <h5 className="font-bold text-primary uppercase tracking-[0.2em] text-xs">Stability Analysis (Post-Assessment)</h5>
                             <div className="flex gap-4">
                                <div className="text-right">
                                   <p className="text-lg font-bold text-foreground">+{a.training_after?.xp || 0}</p>
                                   <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Total XP</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-lg font-bold text-blue-600">{a.training_after?.exercises || 0}</p>
                                   <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Exercises</p>
                                </div>
                             </div>
                          </div>
                          
                          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                             <p className="text-sm text-foreground/80 leading-relaxed italic">
                                "Corrective exercises were automatically assigned focused on mirror-letter confusion patterns identified during this diagnostic session."
                             </p>
                          </div>

                          <Button 
                            onClick={() => window.location.href = `/reports/full?student_id=${selectedStudent.id}`}
                            variant="outline"
                            className="w-full rounded-2xl h-12 border-primary/20 text-primary hover:bg-primary/5 font-bold"
                          >
                            <FileText className="w-4 h-4 mr-2" /> Open Clinical Data Viewer
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setAddError(null); setAddSuccess(null); setNewShareKey(""); }} />
          <div className="relative bg-card w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-border animate-scaleIn overflow-hidden">
            <div className="absolute top-0 right-0 p-12 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <button onClick={() => { setShowAddModal(false); setAddError(null); setAddSuccess(null); setNewShareKey(""); }} className="relative z-10 absolute top-4 right-4 p-2 hover:bg-secondary rounded-full">
              <X className="w-4 h-4" />
            </button>
            
            {/* Header */}
            <div className="relative z-10 flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-fredoka font-bold">New Connection</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">Patient Synchronization</p>
            </div>

            <div className="relative z-10 mt-2 mb-8 bg-secondary/50 rounded-2xl p-5 text-xs text-muted-foreground leading-relaxed border flex gap-3">
              <div className="p-2 bg-white rounded-lg h-fit border border-secondary shadow-sm"><Lightbulb className="w-4 h-4 text-primary" /></div>
              <p>Ask your patient to share their <span className="font-bold text-foreground">Portal Share Key</span> from their Personal Profile. Expected format: <span className="font-mono font-bold text-primary">MNT-XXXXXX</span></p>
            </div>
            
            <div className="relative z-10 space-y-6">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block text-center">Biometric Access Key</label>
                <input 
                  type="text" 
                  value={newShareKey}
                  onChange={(e) => setNewShareKey(e.target.value.toUpperCase())}
                  placeholder="MNT-XXXXXX"
                  maxLength={10}
                  className="flex h-16 w-full rounded-2xl border-2 border-primary bg-background px-4 py-2 text-2xl font-mono font-black text-primary tracking-[0.3em] text-center focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-xl shadow-primary/5"
                  autoFocus
                />
              </div>
              
              {addError && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-4 text-xs font-bold animate-pulse">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              
              {addSuccess && (
                <div className="flex items-start gap-2 bg-green-50 text-emerald-700 rounded-2xl p-4 text-xs font-bold border border-emerald-100">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{addSuccess}</span>
                </div>
              )}
              
              <Button 
                onClick={handleAddPatient} 
                disabled={addLoading || newShareKey.length < 9}
                className="w-full rounded-2xl h-14 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
              >
                {addLoading ? "Processing Biometrics..." : "Establish Connection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
