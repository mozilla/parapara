# Make file for parapara wall stuff

# Output directory
builddir = build
distdir = public

# Output list
wallmaker = $(distdir)/wall-maker/js/wallmaker.js

# Default target
all: wallmaker

.PHONY: wallmaker clean

wallmaker:
	node $(builddir)/r.js -o $(builddir)/build-wallmaker.js

clean:
	rm -f $(wallmaker)
