cmake_minimum_required(VERSION 3.10)
project(zyzl_plugin)

SET(LIBRARY_OUTPUT_PATH ${PRJ_INTERNAL_BUILD}/lib)
add_compile_options(-std=gnu++11 -g)
include_directories(${PROJECT_SOURCE_DIR})

aux_source_directory(. API_SRC)

find_library(TDF_LIB libzh_utils.so ${PRJ_INTERNAL_BUILD}/lib)
find_library(SQL_LIB libsqlite_orm.so ${PRJ_INTERNAL_BUILD}/lib)

add_library(zyzl_plugin SHARED ${API_SRC})

target_link_libraries(zyzl_plugin rt ssl uuid ${TDF_LIB} ${SQL_LIB})