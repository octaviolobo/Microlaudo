CREATE TABLE report_images (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  image_url  TEXT    NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT max_3_images   CHECK (sort_order BETWEEN 1 AND 3),
  CONSTRAINT unique_sort_order UNIQUE (report_id, sort_order)
);

CREATE INDEX idx_report_images_report_id ON report_images (report_id);
