cmake_minimum_required(VERSION 3.10)
project(serial_link)

SET(LIBRARY_OUTPUT_PATH ${PRJ_INTERNAL_BUILD}/lib)
add_compile_options(-std=gnu++11 -g)
include_directories(${PROJECT_SOURCE_DIR})

aux_source_directory(. API_SRC)

add_library(serial_link SHARED ${API_SRC})

target_link_libraries(serial_link pthread modbus)