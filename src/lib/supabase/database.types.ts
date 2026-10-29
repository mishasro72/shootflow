
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "actor_type": Database["public"]['Enums']["actor_type"],"created_at": string,"id": string,"payload": NonNullable<Json>,"project_id": string,"type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_type": Database["public"]['Enums']["actor_type"],"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"project_id": string,"type": string,"workspace_id": string
                  }
                  Update: {
                    "actor_type"?: Database["public"]['Enums']["actor_type"],"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"project_id"?: string,"type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_events_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_name": string,"author_type": Database["public"]['Enums']["author_type"],"concept_item_id": string | null,"created_at": string,"id": string,"photo_id": string | null,"project_id": string,"text": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_name": string,"author_type": Database["public"]['Enums']["author_type"],"concept_item_id"?: string | null,"created_at"?: string,"id"?: string,"photo_id"?: string | null,"project_id": string,"text": string,"workspace_id": string
                  }
                  Update: {
                    "author_name"?: string,"author_type"?: Database["public"]['Enums']["author_type"],"concept_item_id"?: string | null,"created_at"?: string,"id"?: string,"photo_id"?: string | null,"project_id"?: string,"text"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_concept_item_id_fkey"
      columns: ["concept_item_id"]
isOneToOne: false
      referencedRelation: "concept_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_photo_id_fkey"
      columns: ["photo_id"]
isOneToOne: false
      referencedRelation: "photos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"concept_items": {
                  Row: {
                    "category": Database["public"]['Enums']["concept_category"],"created_at": string,"description": string | null,"id": string,"image_key": string | null,"is_checked": boolean,"project_id": string,"sort_order": number,"status": Database["public"]['Enums']["concept_status"],"status_changed_at": string | null,"title": string,"updated_at": string,"visible_to_client": boolean,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["concept_category"],"created_at"?: string,"description"?: string | null,"id"?: string,"image_key"?: string | null,"is_checked"?: boolean,"project_id": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["concept_status"],"status_changed_at"?: string | null,"title"?: string,"updated_at"?: string,"visible_to_client": boolean,"workspace_id": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["concept_category"],"created_at"?: string,"description"?: string | null,"id"?: string,"image_key"?: string | null,"is_checked"?: boolean,"project_id"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["concept_status"],"status_changed_at"?: string | null,"title"?: string,"updated_at"?: string,"visible_to_client"?: boolean,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "concept_items_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "concept_items_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"extra_retouch_orders": {
                  Row: {
                    "created_at": string,"currency": string,"id": string,"project_id": string,"quantity": number,"status": Database["public"]['Enums']["retouch_order_status"],"unit_price_cents": number,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"project_id": string,"quantity": number,"status"?: Database["public"]['Enums']["retouch_order_status"],"unit_price_cents": number,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"project_id"?: string,"quantity"?: number,"status"?: Database["public"]['Enums']["retouch_order_status"],"unit_price_cents"?: number,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "extra_retouch_orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extra_retouch_orders_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"link_codes": {
                  Row: {
                    "channel": Database["public"]['Enums']["notification_channel"],"code": string,"created_at": string,"expires_at": string,"project_client_id": string | null,"used_at": string | null,"user_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel"?: Database["public"]['Enums']["notification_channel"],"code"?: string,"created_at"?: string,"expires_at"?: string,"project_client_id"?: string | null,"used_at"?: string | null,"user_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["notification_channel"],"code"?: string,"created_at"?: string,"expires_at"?: string,"project_client_id"?: string | null,"used_at"?: string | null,"user_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "link_codes_project_client_id_fkey"
      columns: ["project_client_id"]
isOneToOne: false
      referencedRelation: "project_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "link_codes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "link_codes_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_endpoints": {
                  Row: {
                    "address": string,"channel": Database["public"]['Enums']["notification_channel"],"created_at": string,"id": string,"is_enabled": boolean,"project_client_id": string | null,"recipient_type": Database["public"]['Enums']["recipient_type"],"updated_at": string,"user_id": string | null,"verified_at": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"channel": Database["public"]['Enums']["notification_channel"],"created_at"?: string,"id"?: string,"is_enabled"?: boolean,"project_client_id"?: string | null,"recipient_type": Database["public"]['Enums']["recipient_type"],"updated_at"?: string,"user_id"?: string | null,"verified_at"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "address"?: string,"channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"id"?: string,"is_enabled"?: boolean,"project_client_id"?: string | null,"recipient_type"?: Database["public"]['Enums']["recipient_type"],"updated_at"?: string,"user_id"?: string | null,"verified_at"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_endpoints_project_client_id_fkey"
      columns: ["project_client_id"]
isOneToOne: false
      referencedRelation: "project_clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_endpoints_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_endpoints_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"endpoint_id": string,"event_id": string | null,"id": string,"last_error": string | null,"send_after": string,"sent_at": string | null,"status": Database["public"]['Enums']["outbox_status"],"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"endpoint_id": string,"event_id"?: string | null,"id"?: string,"last_error"?: string | null,"send_after"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["outbox_status"],"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"endpoint_id"?: string,"event_id"?: string | null,"id"?: string,"last_error"?: string | null,"send_after"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["outbox_status"],"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_outbox_endpoint_id_fkey"
      columns: ["endpoint_id"]
isOneToOne: false
      referencedRelation: "notification_endpoints"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_outbox_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "activity_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_outbox_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"photos": {
                  Row: {
                    "bytes": number,"created_at": string,"final_bytes": number | null,"final_key": string | null,"final_preview_key": string | null,"height": number | null,"id": string,"is_selected": boolean,"original_filename": string,"preview_key": string,"project_id": string,"selected_at": string | null,"selection_type": Database["public"]['Enums']["selection_type"] | null,"sort_order": number,"thumb_key": string,"updated_at": string,"width": number | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bytes"?: number,"created_at"?: string,"final_bytes"?: number | null,"final_key"?: string | null,"final_preview_key"?: string | null,"height"?: number | null,"id"?: string,"is_selected"?: boolean,"original_filename": string,"preview_key": string,"project_id": string,"selected_at"?: string | null,"selection_type"?: Database["public"]['Enums']["selection_type"] | null,"sort_order"?: number,"thumb_key": string,"updated_at"?: string,"width"?: number | null,"workspace_id": string
                  }
                  Update: {
                    "bytes"?: number,"created_at"?: string,"final_bytes"?: number | null,"final_key"?: string | null,"final_preview_key"?: string | null,"height"?: number | null,"id"?: string,"is_selected"?: boolean,"original_filename"?: string,"preview_key"?: string,"project_id"?: string,"selected_at"?: string | null,"selection_type"?: Database["public"]['Enums']["selection_type"] | null,"sort_order"?: number,"thumb_key"?: string,"updated_at"?: string,"width"?: number | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "photos_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"max_active_projects": number,"max_photos_per_project": number,"max_storage_bytes": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"max_active_projects": number,"max_photos_per_project": number,"max_storage_bytes": number,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"max_active_projects"?: number,"max_photos_per_project"?: number,"max_storage_bytes"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"locale": string,"name": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"locale"?: string,"name"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"locale"?: string,"name"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_clients": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"last_seen_at": string | null,"name": string,"project_id": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"last_seen_at"?: string | null,"name": string,"project_id": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"last_seen_at"?: string | null,"name"?: string,"project_id"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_clients_project_id_fkey"
      columns: ["project_id"]
isOneToOne: true
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_clients_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "access_token": string,"archived_at": string | null,"client_locale": string,"completed_at": string | null,"created_at": string,"delivered_at": string | null,"extra_retouch_enabled": boolean,"google_place_id": string | null,"id": string,"location_address": string | null,"location_lat": number | null,"location_lng": number | null,"location_map_url": string | null,"location_name": string | null,"notes": string | null,"pin_failed_attempts": number,"pin_hash": string | null,"pin_locked_until": string | null,"place_synced_at": string | null,"reminder_24h_sent_at": string | null,"retouch_limit": number,"selection_submitted_at": string | null,"shoot_end": string | null,"shoot_start": string | null,"status": Database["public"]['Enums']["project_status"],"timezone": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token"?: string,"archived_at"?: string | null,"client_locale"?: string,"completed_at"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"extra_retouch_enabled"?: boolean,"google_place_id"?: string | null,"id"?: string,"location_address"?: string | null,"location_lat"?: number | null,"location_lng"?: number | null,"location_map_url"?: string | null,"location_name"?: string | null,"notes"?: string | null,"pin_failed_attempts"?: number,"pin_hash"?: string | null,"pin_locked_until"?: string | null,"place_synced_at"?: string | null,"reminder_24h_sent_at"?: string | null,"retouch_limit"?: number,"selection_submitted_at"?: string | null,"shoot_end"?: string | null,"shoot_start"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"timezone"?: string,"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "access_token"?: string,"archived_at"?: string | null,"client_locale"?: string,"completed_at"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"extra_retouch_enabled"?: boolean,"google_place_id"?: string | null,"id"?: string,"location_address"?: string | null,"location_lat"?: number | null,"location_lng"?: number | null,"location_map_url"?: string | null,"location_name"?: string | null,"notes"?: string | null,"pin_failed_attempts"?: number,"pin_hash"?: string | null,"pin_locked_until"?: string | null,"place_synced_at"?: string | null,"reminder_24h_sent_at"?: string | null,"retouch_limit"?: number,"selection_submitted_at"?: string | null,"shoot_end"?: string | null,"shoot_start"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"timezone"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"shot_list_items": {
                  Row: {
                    "concept_item_id": string | null,"created_at": string,"description": string | null,"id": string,"project_id": string,"reference_image_key": string | null,"reject_reason": string | null,"shot_status": Database["public"]['Enums']["shot_status"],"sort_order": number,"status_changed_at": string | null,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "concept_item_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"project_id": string,"reference_image_key"?: string | null,"reject_reason"?: string | null,"shot_status"?: Database["public"]['Enums']["shot_status"],"sort_order"?: number,"status_changed_at"?: string | null,"title"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "concept_item_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"project_id"?: string,"reference_image_key"?: string | null,"reject_reason"?: string | null,"shot_status"?: Database["public"]['Enums']["shot_status"],"sort_order"?: number,"status_changed_at"?: string | null,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shot_list_items_concept_item_id_fkey"
      columns: ["concept_item_id"]
isOneToOne: false
      referencedRelation: "concept_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shot_list_items_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shot_list_items_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "brand_name": string | null,"calendar_feed_token": string,"created_at": string,"default_locale": string,"default_retouch_limit": number,"id": string,"name": string,"plan_id": string,"storage_used_bytes": number,"updated_at": string,"watermark_logo_key": string | null,"watermark_text": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_name"?: string | null,"calendar_feed_token"?: string,"created_at"?: string,"default_locale"?: string,"default_retouch_limit"?: number,"id"?: string,"name": string,"plan_id": string,"storage_used_bytes"?: number,"updated_at"?: string,"watermark_logo_key"?: string | null,"watermark_text"?: string | null
                  }
                  Update: {
                    "brand_name"?: string | null,"calendar_feed_token"?: string,"created_at"?: string,"default_locale"?: string,"default_retouch_limit"?: number,"id"?: string,"name"?: string,"plan_id"?: string,"storage_used_bytes"?: number,"updated_at"?: string,"watermark_logo_key"?: string | null,"watermark_text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "transition_project_status":
{ Args: { "p_actor"?: Database["public"]['Enums']["actor_type"],"p_project_id": string,"p_to": Database["public"]['Enums']["project_status"] }; Returns: {
              "access_token": string,
"archived_at": string | null,
"client_locale": string,
"completed_at": string | null,
"created_at": string,
"delivered_at": string | null,
"extra_retouch_enabled": boolean,
"google_place_id": string | null,
"id": string,
"location_address": string | null,
"location_lat": number | null,
"location_lng": number | null,
"location_map_url": string | null,
"location_name": string | null,
"notes": string | null,
"pin_failed_attempts": number,
"pin_hash": string | null,
"pin_locked_until": string | null,
"place_synced_at": string | null,
"reminder_24h_sent_at": string | null,
"retouch_limit": number,
"selection_submitted_at": string | null,
"shoot_end": string | null,
"shoot_start": string | null,
"status": Database["public"]['Enums']["project_status"],
"timezone": string,
"title": string,
"updated_at": string,
"workspace_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "projects"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "actor_type": "PHOTOGRAPHER"|"CLIENT"|"SYSTEM","author_type": "PHOTOGRAPHER"|"CLIENT","concept_category": "MOODBOARD"|"WARDROBE"|"EQUIPMENT","concept_status": "PENDING"|"APPROVED"|"CHANGES_REQUESTED","notification_channel": "TELEGRAM"|"EMAIL","outbox_status": "PENDING"|"SENT"|"FAILED"|"SKIPPED","project_status": "DRAFT"|"PLANNING"|"SHOOT_DAY"|"PROOFING"|"SELECTION_SUBMITTED"|"RETOUCHING"|"DELIVERED"|"COMPLETED","recipient_type": "PHOTOGRAPHER"|"CLIENT","retouch_order_status": "PENDING"|"PAID"|"CANCELLED","selection_type": "INCLUDED"|"EXTRA","shot_status": "PENDING"|"SHOT"|"REJECTED","workspace_role": "OWNER"|"ASSISTANT"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "actor_type": ["PHOTOGRAPHER", "CLIENT", "SYSTEM"],"author_type": ["PHOTOGRAPHER", "CLIENT"],"concept_category": ["MOODBOARD", "WARDROBE", "EQUIPMENT"],"concept_status": ["PENDING", "APPROVED", "CHANGES_REQUESTED"],"notification_channel": ["TELEGRAM", "EMAIL"],"outbox_status": ["PENDING", "SENT", "FAILED", "SKIPPED"],"project_status": ["DRAFT", "PLANNING", "SHOOT_DAY", "PROOFING", "SELECTION_SUBMITTED", "RETOUCHING", "DELIVERED", "COMPLETED"],"recipient_type": ["PHOTOGRAPHER", "CLIENT"],"retouch_order_status": ["PENDING", "PAID", "CANCELLED"],"selection_type": ["INCLUDED", "EXTRA"],"shot_status": ["PENDING", "SHOT", "REJECTED"],"workspace_role": ["OWNER", "ASSISTANT"]
          }
        }
} as const
