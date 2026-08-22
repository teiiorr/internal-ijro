"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCamera, IconLoader2 } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { compressImage } from "@/lib/images/compress";

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  canEdit: boolean;
  department?: string | null;
  position?: string | null;
}

export function AvatarUpload({ userId, name, avatarUrl, canEdit, department, position }: Props) {
  const [url, setUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(raw: File) {
    setUploading(true);
    try {
      const { file } = await compressImage(raw, { targetBytes: 200 * 1024, maxDimension: 512 });
      const res = await fetch(`/api/files/avatar?userId=${userId}&name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (res.ok) {
        const data = await res.json();
        setUrl(data.url);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group">
      <UserAvatar name={name} avatarUrl={url} size="lg" department={department} position={position} />
      {canEdit && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {uploading ? (
              <IconLoader2 className="size-5 text-white animate-spin" />
            ) : (
              <IconCamera className="size-5 text-white" />
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
