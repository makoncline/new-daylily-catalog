SELECT
  'has_v2_ahs_cultivar_table' AS "check",
  EXISTS(
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = 'V2AhsCultivar'
  ) AS "value";

SELECT
  'has_cultivar_reference_v2_column' AS "check",
  EXISTS(
    SELECT 1
    FROM pragma_table_info('CultivarReference')
    WHERE name = 'v2AhsCultivarId'
  ) AS "value";

SELECT
  'has_v2_link_unique_index' AS "check",
  EXISTS(
    SELECT 1
    FROM sqlite_master
    WHERE type = 'index'
      AND name = 'CultivarReference_v2AhsCultivarId_key'
  ) AS "value";

SELECT
  'has_v2_link_lookup_index' AS "check",
  EXISTS(
    SELECT 1
    FROM sqlite_master
    WHERE type = 'index'
      AND name = 'CultivarReference_v2AhsCultivarId_idx'
  ) AS "value";

SELECT
  'has_v2_link_normalized_name_index' AS "check",
  EXISTS(
    SELECT 1
    FROM sqlite_master
    WHERE type = 'index'
      AND name = 'V2AhsCultivar_link_normalized_name_idx'
  ) AS "value";
