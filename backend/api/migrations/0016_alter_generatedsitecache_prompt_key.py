"""Migration: Replace category-based unique key with prompt_key on GeneratedSiteCache.

Changes:
  1. RenameField: category → prompt_key  (preserves existing data in existing rows)
  2. AlterField:  prompt_key — increase max_length to 512, keep unique + db_index
  3. AddField:    category (non-unique, blank, db_index) — metadata only
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_generatedsitecache'),
    ]

    operations = [
        # Step 1: rename the unique category column to prompt_key
        migrations.RenameField(
            model_name='generatedsitecache',
            old_name='category',
            new_name='prompt_key',
        ),
        # Step 2: widen max_length to hold full normalized prompts (was 100)
        migrations.AlterField(
            model_name='generatedsitecache',
            name='prompt_key',
            field=models.CharField(db_index=True, max_length=512, unique=True),
        ),
        # Step 3: add optional category metadata column (not unique)
        migrations.AddField(
            model_name='generatedsitecache',
            name='category',
            field=models.CharField(blank=True, db_index=True, default='', max_length=100),
        ),
    ]
