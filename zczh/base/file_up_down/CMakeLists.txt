cmake_minimum_required(VERSION 3.10)
project(file_up_down)

SET(LIBRARY_OUTPUT_PATH ${PRJ_INTERNAL_BUILD}/lib)
add_compile_options(-std=gnu++11 -g)
include_directories(${PROJECT_SOURCE_DIR})

aux_source_directory(. API_SRC)

find_library(TDF_LIB libzh_utils.so ${PRJ_INTERNAL_BUILD}/lib)
find_library(SQL_LIB libsqlite_orm.so ${PRJ_INTERNAL_BUILD}/lib)
add_library(file_up_down SHARED ${API_SRC})

target_link_libraries(file_up_down rt ssl uuid ${TDF_LIB} ${SQL_LIB})