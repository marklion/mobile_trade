cmake_minimum_required(VERSION 3.10)
project(modbus_scale_total)

add_compile_options(-g)

aux_source_directory(. MST_SRC)
add_executable(mst_server ${MST_SRC})

target_link_libraries(mst_server modbus)
