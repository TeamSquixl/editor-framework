export ORIGINAL_PATH=`pwd`

# check if we have builtin
if [ ! -d "builtin" ]; then
    mkdir builtin
fi
cd builtin

repos=( \
console \
ipc-debugger \
package-manager \
tester \
ui-kit \
)

for name in "${repos[@]}"
do
    if [ ! -d "${name}" ]; then
        git clone https://github.com/fireball-packages/${name}
    fi
done

cd ${ORIGINAL_PATH}
