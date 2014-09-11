# Make file for parapara library and editor

# Source directories
srcdir = lib/js

# Output directory
builddir = build

# Dependencies (these are combined into the library)
_deps = bind.js \
			  uuid.core.js
deps = $(patsubst %,$(srcdir)/%,$(_deps))

# External dependencies (these are simply copied alongside the library when the
# 'export' step is run)
# Removing webL10n for now since we've made local modifications to it that are
# yet to be merged upstream
# extdeps =	$(srcdir)/webL10n/l10n.js
extdeps =	

# Modules (these are combined into the library)
modules =	$(srcdir)/parapara.js \
					$(srcdir)/eraser.js \
					$(srcdir)/svgClassList.js \
					$(srcdir)/xhr.js

# File list
files = $(modules) $(deps)

# Output list
parapara = $(builddir)/parapara.core.js
parapara-dev = $(builddir)/parapara-dev.core.js

# Default target
all: lib

# Compressed version
$(parapara): $(parapara-dev)
	java -jar tools/yuicompressor-2.4.7.jar --type js $^ -o $@

# Debug version
$(parapara-dev): $(files)
	cat > $@ $^

lib: $(parapara)

.PHONY: clean export

clean:
	rm -f $(parapara) $(parapara-dev)

# Export the output to elsewhere in the project

export_paths = public/js

export: $(parapara) $(parapara-dev) $(extdeps)
	for path in $(export_paths); do \
		mkdir -p $$path; \
		cp $^ $$path; \
	done
