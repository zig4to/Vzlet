// Ročno napisani tipi za tabele Vzleta v Supabase (predpona `pisi_`).
// Ustrezajo supabase/migrations/0002–0008. Če imaš Supabase CLI, jih lahko
// nadomestiš z generiranimi:
//   supabase gen types typescript --project-id <id> > src/lib/types/database.types.ts

/**
 * En vnos v `pisi_vzlet_days.tasks_snapshot` (jsonb) — trajen posnetek
 * opravila ob poravnavi/sinhronizaciji dneva, neodvisen od poznejšega
 * premikanja neopravljenih opravil naprej (glej 0008_vzlet_days_snapshot.sql).
 */
export type VzletTaskSnapshotEntry = {
  title: string;
  done: boolean;
  isPenalty: boolean;
  isLater: boolean;
  difficulty: number | null;
};

export type Database = {
  public: {
    Tables: {
      pisi_vzlet_tasks: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          title: string;
          for_date: string;
          done: boolean;
          done_at: string | null;
          position: number;
          is_penalty: boolean;
          difficulty: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          for_date: string;
          done?: boolean;
          done_at?: string | null;
          position?: number;
          is_penalty?: boolean;
          difficulty?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          for_date?: string;
          done?: boolean;
          done_at?: string | null;
          position?: number;
          is_penalty?: boolean;
          difficulty?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pisi_vzlet_days: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          day: string;
          points: number;
          tasks_total: number;
          tasks_done: number;
          all_done: boolean;
          tasks_snapshot: VzletTaskSnapshotEntry[] | null;
          settled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          day: string;
          points: number;
          tasks_total?: number;
          tasks_done?: number;
          all_done?: boolean;
          tasks_snapshot?: VzletTaskSnapshotEntry[] | null;
          settled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day?: string;
          points?: number;
          tasks_total?: number;
          tasks_done?: number;
          all_done?: boolean;
          tasks_snapshot?: VzletTaskSnapshotEntry[] | null;
          settled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pisi_vzlet_penalty_pool: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          position?: number;
          created_at?: string;
        };
      };
      pisi_vzlet_sharing: {
        Relationships: [];
        Row: {
          user_id: string;
          shared: boolean;
          display_name: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          shared?: boolean;
          display_name?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          shared?: boolean;
          display_name?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type VzletTask = Database["public"]["Tables"]["pisi_vzlet_tasks"]["Row"];
export type VzletTaskInsert =
  Database["public"]["Tables"]["pisi_vzlet_tasks"]["Insert"];
export type VzletTaskUpdate =
  Database["public"]["Tables"]["pisi_vzlet_tasks"]["Update"];

export type VzletDay = Database["public"]["Tables"]["pisi_vzlet_days"]["Row"];
export type VzletDayInsert =
  Database["public"]["Tables"]["pisi_vzlet_days"]["Insert"];
export type VzletDayUpdate =
  Database["public"]["Tables"]["pisi_vzlet_days"]["Update"];

export type VzletPenaltyItem =
  Database["public"]["Tables"]["pisi_vzlet_penalty_pool"]["Row"];
export type VzletPenaltyItemInsert =
  Database["public"]["Tables"]["pisi_vzlet_penalty_pool"]["Insert"];
export type VzletPenaltyItemUpdate =
  Database["public"]["Tables"]["pisi_vzlet_penalty_pool"]["Update"];

export type VzletSharing =
  Database["public"]["Tables"]["pisi_vzlet_sharing"]["Row"];

// Oseba, ki deli svoje dnevne cilje (za dropdown „Cilji drugih“).
export type VzletSharer = { userId: string; name: string };

// Opravilo druge osebe v pogledu „Cilji drugih“ (samo za branje).
export type VzletSharedTask = Pick<
  VzletTask,
  "id" | "title" | "done" | "is_penalty" | "for_date"
>;
