"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume, improveWithAI } from "@/actions/resume";
import { EntryForm } from "./entry-form";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
import html2pdf from "html2pdf.js/dist/html2pdf.min.js";

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent || "");
  const [resumeMode, setResumeMode] = useState("preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  
  const { user } = useUser();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {},
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
    },
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  const formValues = watch();

  // Switch to preview if initial content exists
  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  // Sync Form -> Markdown only when actively editing the form
  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      setPreviewContent(newContent || initialContent || "");
    }
  }, [formValues, activeTab]);

  useEffect(() => {
    if (saveResult && !isSaving) toast.success("Resume saved successfully!");
    if (saveError) toast.error(saveError.message || "Failed to save resume");
  }, [saveResult, saveError, isSaving]);

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo.mobile) parts.push(`📱 ${contactInfo.mobile}`);
    if (contactInfo.linkedin) parts.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
    if (contactInfo.twitter) parts.push(`🐦 [Twitter](${contactInfo.twitter})`);

    return parts.length > 0
      ? `## <div align="center">${user?.fullName || "Resume"}</div>\n\n<div align="center">\n\n${parts.join(" | ")}\n\n</div>`
      : "";
  };

  const getCombinedContent = () => {
    const { summary, skills, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById("resume-pdf");
      const opt = {
        margin: [15, 15],
        filename: `${user?.fullName || "resume"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImproveWithAI = async () => {
    if (!previewContent) return toast.error("Please add some content first");
    
    setIsImproving(true);
    try {
      const improved = await improveWithAI({
        current: previewContent,
        type: "resume",
      });
      setPreviewContent(improved);
      toast.success("Resume polished by AI!");
    } catch (error) {
      toast.error("AI improvement failed");
    } finally {
      setIsImproving(false);
    }
  };

  const onSubmit = async () => {
    try {
      await saveResumeFn(previewContent);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div data-color-mode="light" className="space-y-6 max-w-5xl mx-auto">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background/95 backdrop-blur sticky top-0 z-10 py-4 border-b">
        <div>
          <h1 className="font-bold gradient-title text-4xl">Resume Builder</h1>
          <p className="text-muted-foreground text-sm">Design your professional story</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="flex-1 md:flex-none"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
          <Button 
            onClick={generatePDF} 
            disabled={isGenerating}
            className="flex-1 md:flex-none"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit">1. Structured Form</TabsTrigger>
          <TabsTrigger value="preview">2. Markdown & AI</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-8 mt-6">
          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold border-b pb-2">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input {...register("contactInfo.email")} placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mobile</label>
                <Input {...register("contactInfo.mobile")} placeholder="+1 234..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">LinkedIn</label>
                <Input {...register("contactInfo.linkedin")} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Twitter / Portfolio</label>
                <Input {...register("contactInfo.twitter")} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold border-b pb-2">Professional Summary</h3>
            <Controller
              name="summary"
              control={control}
              render={({ field }) => (
                <Textarea {...field} className="h-32" placeholder="Briefly explain your impact and goals..." />
              )}
            />
          </div>

          {/* Dynamic Sections */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2">Work Experience</h3>
              <EntryForm type="Experience" entries={formValues.experience} onChange={(val) => setValue("experience", val)} />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2">Education</h3>
              <EntryForm type="Education" entries={formValues.education} onChange={(val) => setValue("education", val)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 mt-6">
          <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResumeMode(resumeMode === "preview" ? "edit" : "preview")}
              >
                {resumeMode === "preview" ? <Edit className="w-4 h-4 mr-2" /> : <Monitor className="w-4 h-4 mr-2" />}
                {resumeMode === "preview" ? "Switch to Editor" : "Show Preview"}
              </Button>
            </div>

            <Button
              size="sm"
              variant="premium"
              onClick={handleImproveWithAI}
              disabled={isImproving}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
            >
              {isImproving ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI Polish
            </Button>
          </div>

          {resumeMode !== "preview" && (
            <div className="flex p-3 gap-2 items-center bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">
                Warning: Manual markdown edits will be overwritten if you go back and update the Form.
              </span>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden shadow-inner">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
              extraCommands={[]} // Cleans up the toolbar
            />
          </div>

          {/* Hidden Export Target */}
          <div className="hidden">
            <div
              id="resume-pdf"
              className="bg-white text-black p-12"
              style={{ 
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "12pt",
                lineHeight: "1.4"
              }}
            >
              <MDEditor.Markdown
                source={previewContent}
                style={{ background: "white", color: "black" }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}