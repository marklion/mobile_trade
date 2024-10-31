cmake_minimum_required(VERSION 3.10)
project(utils)

SET(LIBRARY_OUTPUT_PATH ${PRJ_INTERNAL_BUILD}/lib)
add_compile_options(-std=gnu++11 -g)
include_directories(${PROJECT_SOURCE_DIR})

aux_source_directory(. API_SRC)

add_library(zh_utils SHARED ${API_SRC})

target_link_libraries(zh_utils rt ssl uuid)