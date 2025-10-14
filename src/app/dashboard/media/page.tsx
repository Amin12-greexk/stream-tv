"use client";
import { useEffect, useState } from "react";

export default function MediaPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [list, setList] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/media", { cache: "no-store" });
    const data = await res.json();
    setList(data);
  }

  useEffect(() => { load(); }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.[0]) return;
    const fd = new FormData();
    fd.append("file", files[0]);
    fd.append("title", files[0].name);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    if (res.ok) load();
    else alert("Upload failed");
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onUpload} className="flex items-center gap-2">
        <input type="file" onChange={(e)=>setFiles(e.target.files)} />
        <button className="bg-black text-white px-3 py-2">Upload</button>
      </form>

      <div className="grid gap-3">
        {list.map(m => (
          <div key={m.id} className="border p-3 rounded flex items-center justify-between">
            <div>
              <div className="font-medium">{m.title}</div>
              <div className="text-sm text-gray-500">{m.type} • {m.mime} • {m.sizeBytes} bytes</div>
            </div>
            <div className="flex items-center gap-2">
              <a className="underline" href={`/api/stream/${m.filename}`} target="_blank">open</a>
              <button onClick={()=>onDelete(m.id)} className="text-red-600">delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
