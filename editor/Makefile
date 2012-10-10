# Source dir
srcdir = lib/js

# Build dir
builddir = build

# Dependencies
_deps = bind.js \
			  uuid.core.js
deps = $(patsubst %,$(srcdir)/%,$(_deps))

# Modules
_modules = parapara.js \
			  	 eraser.js \
					 svgClassList.js \
					 xhr.js
modules = $(patsubst %,$(srcdir)/%,$(_modules))

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

export: $(parapara) $(parapara-dev)
	for path in $(export_paths); do \
		mkdir -p $$path; \
		cp $^ $$path; \
	done
