*** Settings ***
Resource  ../database.resource
Resource  ../api_base.resource
Resource  ../stuff/stuff_opt.resource
Library  String

*** Keywords ***
Cleanup Exam
    Exam Reset
Add Question
    [Arguments]  ${question}  ${options}  ${correct_index}
    @{option_answers}  Create List
    ${index}  Set Variable  0
    @{option_list}  Split String  ${options}  ,
    FOR    ${element}    IN    @{option_list}
        ${is_correct}  Evaluate  ${index} == ${correct_index}
        &{oa}  Create Dictionary  name=${element}  is_correct=${is_correct}
        Append To List    ${option_answers}  ${oa}
        ${index}  Evaluate  ${index} + 1
    END
    ${req}  Create Dictionary  name=${question}  option_answers=${option_answers}
    ${resp}  Req to Server  /exam/add_question  ${sc_admin_token}  ${req}
    Should Be True  ${resp}[result]
Del Question
    [Arguments]  ${question_id}
    ${req}  Create Dictionary  id=${question_id}
    ${resp}  Req to Server  /exam/del_question  ${sc_admin_token}  ${req}
    Should Be True  ${resp}[result]
Get Question
    ${resp}  Req Get to Server  /exam/get_question  ${sc_admin_token}  questions
    RETURN  ${resp}

Add Exam Paper
    [Arguments]  ${name}  ${stuff_id}
    ${req}  Create Dictionary  name=${name}  stuff_id=${stuff_id}
    ${resp}  Req to Server  /exam/add_paper  ${sc_admin_token}  ${req}

Del Exam Paper
    [Arguments]  ${paper_id}
    ${req}  Create Dictionary  id=${paper_id}
    ${resp}  Req to Server  /exam/del_paper  ${sc_admin_token}  ${req}

Get Exam Paper
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  stuff_id=${stuff_id}
    ${resp}  Req Get to Server  /exam/get_paper  ${sc_admin_token}  papers  ${-1}  &{req}
    RETURN  ${resp}

Add Question to Exam Paper
    [Arguments]  ${paper_id}  ${question_id}
    ${req}  Create Dictionary  paper_id=${paper_id}  question_id=${question_id}
    Req to Server    /exam/add_question2paper    ${sc_admin_token}    ${req}

Del Question from Exam Paper
    [Arguments]  ${paper_id}  ${question_id}
    ${req}  Create Dictionary  paper_id=${paper_id}  question_id=${question_id}
    Req to Server    /exam/del_question_from_paper    ${sc_admin_token}    ${req}

Enable Stuff Exam
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  need_exam=${True}
    Req to Server  /stuff/exam_config  ${sc_admin_token}  ${req}

Disable Stuff Exam
    [Arguments]  ${stuff_id}
    ${req}  Create Dictionary  stuff_id=${stuff_id}  need_exam=${False}
    Req to Server  /stuff/exam_config  ${sc_admin_token}  ${req}

Driver Get Paper
    [Arguments]  ${plan}
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  stuff_id=${plan}[stuff][id]  open_id=${driver}[open_id]
    ${resp}  Req Get to Server    /global/driver_get_paper    none  papers    ${-1}    &{req}
    RETURN  ${resp}
