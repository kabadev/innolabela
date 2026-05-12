"use client";

import { useState, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  BookOpen, 
  Download,
  Loader2,
  Badge,
  X
} from "lucide-react";
import { 
  addGlossaryEntry, 
  updateGlossaryEntry, 
  deleteGlossaryEntry,
  deleteMultipleGlossaryEntries,
  deleteAllGlossaryEntries,
  seedGlossary 
} from "@/app/actions/glossary";
import { DEFAULT_GLOSSARY } from "@/lib/glossary-defaults";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  krio: z.string().min(1, "Krio word is required"),
  variant: z.string().optional(),
  meaning: z.string().min(1, "Meaning is required"),
  example: z.string().optional(),
  translation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function GlossaryClient({ initialEntries }: { initialEntries: any[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewEntries, setPreviewEntries] = useState<any[]>([]);
  const [pastedJson, setPastedJson] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      krio: "",
      variant: "",
      meaning: "",
      example: "",
      translation: "",
    },
  });

  const filteredEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        entry.krio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.meaning.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [entries, searchQuery]);

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    try {
      if (editingEntry) {
        const updated = await updateGlossaryEntry(editingEntry._id, values);
        setEntries(entries.map((e) => (e._id === updated._id ? updated : e)));
        toast.success("Entry updated successfully");
      } else {
        const created = await addGlossaryEntry(values);
        setEntries([created, ...entries]);
        toast.success("Entry added successfully");
      }
      setIsAdding(false);
      setEditingEntry(null);
      form.reset();
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      await deleteGlossaryEntry(id);
      setEntries(entries.filter((e) => e._id !== id));
      toast.success("Entry deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  }

  function handleEdit(entry: any) {
    setEditingEntry(entry);
    form.reset({
      krio: entry.krio,
      variant: entry.variant || "",
      meaning: entry.meaning,
      example: entry.example || "",
      translation: entry.translation || "",
    });
    setIsAdding(true);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Glossary Management
          </h1>
          <p className="text-muted-foreground">Manage Krio-to-English translation shortcuts for annotators.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2 text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200"
            onClick={async () => {
              if (confirm("DANGER: This will permanently delete ALL glossary entries. Are you sure?")) {
                setIsPending(true);
                try {
                  await deleteAllGlossaryEntries();
                  setEntries([]);
                  setSelectedIds([]);
                  toast.success("Glossary cleared");
                } catch (error) {
                  toast.error("Failed to clear glossary");
                } finally {
                  setIsPending(false);
                }
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete All
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", "glossary_export.json");
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
              toast.success("Glossary exported as JSON");
            }}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Dialog open={isImporting} onOpenChange={(open) => {
            setIsImporting(open);
            if (!open) setPreviewEntries([]);
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <Download className="w-4 h-4" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className={cn("sm:max-w-[700px]", previewEntries.length > 0 && "sm:max-w-[90vw] lg:max-w-[1000px]")}>
              <DialogHeader>
                <DialogTitle>Bulk Import Glossary</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {previewEntries.length > 0 ? "Preview and edit entries before importing." : "Upload a JSON or CSV file, or paste JSON data below."}
                </p>
              </DialogHeader>
              
              {previewEntries.length === 0 ? (
                <div className="space-y-6 py-4">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border text-[11px] space-y-2">
                    <p className="font-bold text-indigo-600 uppercase tracking-wider">Required Format</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">CSV Columns:</p>
                        <code className="text-pink-600">krio, meaning, variant, example, translation</code>
                      </div>
                      <div>
                        <p className="font-medium">JSON Keys:</p>
                        <code className="text-pink-600">"krio", "meaning", "variant", ...</code>
                      </div>
                    </div>
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-[10px] text-indigo-600"
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,krio,meaning,variant,example,translation\ndae,is at / progressive,dey,A dae go market.,I am going to the market.";
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "glossary_template.csv");
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      }}
                    >
                      Download CSV Template
                    </Button>
                  </div>

                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label>Upload File (JSON or CSV)</Label>
                    <Input 
                      type="file" 
                      accept=".json,.csv" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const content = event.target?.result as string;
                          try {
                            let data;
                            if (file.name.endsWith(".json")) {
                              data = JSON.parse(content);
                            } else {
                              const lines = content.split("\n");
                              const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
                              data = lines.slice(1).filter(l => l.trim()).map(line => {
                                const values = line.split(",").map(v => v.trim());
                                const obj: any = {};
                                headers.forEach((h, i) => {
                                  if (h === "krio") obj.krio = values[i];
                                  if (h === "variant") obj.variant = values[i];
                                  if (h === "meaning") obj.meaning = values[i];
                                  if (h === "example") obj.example = values[i];
                                  if (h === "translation") obj.translation = values[i];
                                });
                                return obj;
                              });
                            }
                            
                            if (Array.isArray(data)) {
                              const validData = data.filter(item => item.krio && item.meaning).map(item => ({
                                ...item,
                                id: Math.random().toString(36).substr(2, 9),
                                isDuplicate: entries.some(e => e.krio.toLowerCase() === item.krio.toLowerCase())
                              }));
                              setPreviewEntries(validData);
                            }
                          } catch (err) {
                            toast.error("Failed to parse file");
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                    </div>
                  </div>
                  <ScrollArea className="h-[150px] w-full rounded-md border">
                    <Textarea 
                      placeholder='[{"krio": "word", "meaning": "definition"}, ...]'
                      className="min-h-[150px] font-mono text-xs border-none focus-visible:ring-0"
                      value={pastedJson}
                      onChange={(e) => setPastedJson(e.target.value)}
                    />
                  </ScrollArea>
                  <Button 
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      if (!pastedJson) return;
                      try {
                        const data = JSON.parse(pastedJson);
                        if (Array.isArray(data)) {
                          const validData = data.filter(item => item.krio && item.meaning).map(item => ({
                            ...item,
                            id: Math.random().toString(36).substr(2, 9),
                            isDuplicate: entries.some(e => e.krio.toLowerCase() === item.krio.toLowerCase())
                          }));
                          setPreviewEntries(validData);
                        }
                      } catch (err) {
                        toast.error("Invalid JSON format");
                      }
                    }}
                  >
                    Preview Pasted Data
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Total: {previewEntries.length} | 
                      <span className="text-orange-500 ml-1 font-bold">
                        {previewEntries.filter(e => e.isDuplicate).length} will update existing entries
                      </span>
                    </p>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => setPreviewEntries([])}>
                      Clear All
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] border rounded-md">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[120px]">Krio</TableHead>
                          <TableHead className="w-[120px]">Meaning</TableHead>
                          <TableHead>Example</TableHead>
                          <TableHead className="w-[80px] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewEntries.map((entry, idx) => (
                          <TableRow key={entry.id || idx} className={cn(entry.isDuplicate && "bg-orange-50/50")}>
                            <TableCell className="font-bold">
                              <div className="flex items-center gap-2">
                                {entry.krio}
                                {entry.isDuplicate && (
                                  <Badge  className="text-[9px] h-4 bg-orange-500 text-white border-none">UPDATE</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{entry.meaning}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">
                              {entry.example}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-red-500" 
                                onClick={() => setPreviewEntries(previewEntries.filter((_, i) => i !== idx))}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setPreviewEntries([])}>Cancel</Button>
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700"
                      disabled={isPending}
                      onClick={async () => {
                        setIsPending(true);
                        try {
                          const dataToSave = previewEntries.map(({ id, isDuplicate, ...rest }) => rest);
                          const result = await seedGlossary(dataToSave);
                          setEntries(result);
                          toast.success(`Successfully processed ${previewEntries.length} entries`);
                          setIsImporting(false);
                          setPreviewEntries([]);
                          setPastedJson("");
                        } catch (error) {
                          toast.error("Failed to import data");
                        } finally {
                          setIsPending(false);
                        }
                      }}
                    >
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Finalize & Sync {previewEntries.length} Entries
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isAdding} onOpenChange={(open) => {
            setIsAdding(open);
            if (!open) {
              setEditingEntry(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4" />
                Add New Word
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Edit Entry" : "Add New Glossary Word"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="krio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Krio Word (Standardized)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. dae" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="variant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Common Variants (Comma separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. dey, de" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meaning"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meaning (English)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. progressive marker / is at" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="example"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Example Sentence (Krio)</FormLabel>
                          <FormControl>
                            <Input placeholder="A dae go market." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="translation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Example Translation (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="I am going to the market." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingEntry ? "Update Entry" : "Create Entry"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Krio Dictionary</CardTitle>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-in fade-in slide-in-from-left-2">
                  <span className="text-xs font-bold text-indigo-700">{selectedIds.length} selected</span>
                  <div className="w-px h-4 bg-indigo-200 mx-1" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      if (confirm(`Delete ${selectedIds.length} selected entries?`)) {
                        setIsPending(true);
                        try {
                          await deleteMultipleGlossaryEntries(selectedIds);
                          setEntries(entries.filter(e => !selectedIds.includes(e._id)));
                          setSelectedIds([]);
                          toast.success("Selected entries deleted");
                        } catch (error) {
                          toast.error("Failed to delete entries");
                        } finally {
                          setIsPending(false);
                        }
                      }
                    }}
                  >
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search words or meanings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectedIds.length === filteredEntries.length && filteredEntries.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(filteredEntries.map(e => e._id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">Krio</TableHead>
                  <TableHead className="w-[150px]">Variants</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead className="hidden md:table-cell">Example</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No words found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry._id} className={cn(selectedIds.includes(entry._id) && "bg-indigo-50/30")}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(entry._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds([...selectedIds, entry._id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== entry._id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-bold text-indigo-600">{entry.krio}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.variant}</TableCell>
                      <TableCell>{entry.meaning}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs">
                          <p className="italic">"{entry.example}"</p>
                          <p className="text-muted-foreground mt-1">{entry.translation}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(entry._id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
