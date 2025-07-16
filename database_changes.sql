-- Create zones table
CREATE TABLE public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(100) NOT NULL,
  code character varying(10) NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT zones_pkey PRIMARY KEY (id),
  CONSTRAINT zones_name_key UNIQUE (name),
  CONSTRAINT zones_code_key UNIQUE (code)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_zones_active ON public.zones USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_zones_order ON public.zones USING btree (order_index);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_zones_updated_at 
    BEFORE UPDATE ON zones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default zones (matching current enum values)
INSERT INTO public.zones (name, code, description, order_index) VALUES
('Male Zone', 'MALE', 'Capital area and surrounding regions', 1),
('North Zone', 'NORTH', 'Northern atolls and islands', 2),
('Central Zone', 'CENTRAL', 'Central atolls and islands', 3),
('South Zone', 'SOUTH', 'Southern atolls and islands', 4);

-- Create view for zone statistics
CREATE VIEW public.zones_stats_view AS
SELECT 
    z.id,
    z.name,
    z.code,
    z.description,
    z.is_active,
    z.order_index,
    z.created_at,
    z.updated_at,
    COALESCE(island_stats.total_islands, 0) as total_islands,
    COALESCE(island_stats.active_islands, 0) as active_islands,
    COALESCE(route_stats.total_routes, 0) as total_routes,
    COALESCE(route_stats.active_routes, 0) as active_routes
FROM zones z
LEFT JOIN (
    SELECT 
        i.zone,
        COUNT(*) as total_islands,
        COUNT(CASE WHEN i.is_active = true THEN 1 END) as active_islands
    FROM islands i
    GROUP BY i.zone
) island_stats ON LOWER(z.code) = LOWER(island_stats.zone)
LEFT JOIN (
    SELECT 
        i1.zone as from_zone,
        COUNT(DISTINCT r.id) as total_routes,
        COUNT(CASE WHEN r.is_active = true THEN r.id END) as active_routes
    FROM routes r
    JOIN islands i1 ON r.from_island_id = i1.id
    GROUP BY i1.zone
) route_stats ON LOWER(z.code) = LOWER(route_stats.from_zone);

-- Update islands table to reference zones table (optional foreign key)
-- Note: This would require updating existing data to match zone codes
-- ALTER TABLE islands ADD COLUMN zone_id uuid;
-- ALTER TABLE islands ADD CONSTRAINT islands_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);

-- Create zone activity logs table for tracking changes
CREATE TABLE public.zone_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  action character varying(50) NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT zone_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT zone_activity_logs_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id),
  CONSTRAINT zone_activity_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

-- Create index for zone activity logs
CREATE INDEX IF NOT EXISTS idx_zone_activity_logs_zone_id ON public.zone_activity_logs USING btree (zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_activity_logs_created_at ON public.zone_activity_logs USING btree (created_at); 