#!/bin/bash
release_date="20221106"
filename="cpython-3.8.15+${release_date}-x86_64-apple-darwin-install_only.tar.gz"


standalone_python="python/"

if [ ! -d "$standalone_python" ]; then
    wget https://github.com/indygreg/python-build-standalone/releases/download/${release_date}/${filename}
    tar -xzvf ${filename}
    rm -rf ${filename}
    # Now delete the test/ folder, saving about 23MB of disk space
    rm -rf python/lib/python3.8/test
else
    echo "Already downloaded Python into $standalone_python"
fi