*** Settings ***
Resource  exam.resource
Resource    ../safe_check/sc_opt.resource
Suite Setup  Prepare A Paied Plan
Suite Teardown  Run Keywords  Cleanup Paied Plan  Cleanup Exam

*** Test Cases ***
Question Add And Del
    [Teardown]  Cleanup Exam
    Add Question  q1  a1,a2,a3,a4  ${0}
    Add Question  q2  a5,a6,a7,a8  ${0}
    ${aq}  Get Question
    Del Question    ${aq}[0][id]
    ${aq}  Get Question
    Length Should Be    ${aq}    1

Exam Paper Operate
    [Teardown]  Cleanup Exam
    Prepare Two Papers
    ${aep}  Get Exam Paper  ${test_stuff}[id]
    Should Be Equal    ${aep}[0][questions][0][option_answers][0][name]    a1
    Should Be Equal    ${aep}[0][questions][1][option_answers][1][name]    a6
    Length Should Be    ${aep}[1][questions]    1
    ${focus_id}  Set Variable  ${aep}[0][id]
    ${aq}  Get Question
    Del Question from Exam Paper    ${focus_id}    ${aq}[0][id]
    ${focus_id}  Set Variable  ${aep}[1][id]
    Del Exam Paper    ${focus_id}
    ${aep}  Get Exam Paper  ${test_stuff}[id]
    Should Be Equal    ${aep}[0][questions][0][option_answers][1][name]    a6

Plan Checkin Limit
    [Teardown]  Cleanup Exam
    Prepare Two Papers
    Enable Stuff Exam    ${test_stuff}[id]
    Check In A Plan    ${test_plan}  ${True}
    Disable Stuff Exam    ${test_stuff}[id]
    Check In A Plan    ${test_plan}
    Cancel Check In Plan    ${test_plan}

Driver Paper Operate
    [Teardown]  Cleanup Exam
    Prepare Two Papers
    Enable Stuff Exam    ${test_stuff}[id]
    ${resp}  Driver Get Paper    ${test_plan}
    Length Should Be    ${resp}    2
    Should Not Contain    ${resp}[0][questions][0][option_answers][0]    is_correct
    Answer Spec Paper    ${resp}[0]    ${test_plan}    dr_answer
    Answer Spec Paper    ${resp}[1]    ${test_plan}    yy_answer  ${True}
    ${exams}  Get Exam By Plan    ${test_plan}
    Length Should Be    ${exams}    1
    Answer Spec Paper    ${resp}[1]    ${test_plan}    yy_answer
    ${exams}  Get Exam By Plan    ${test_plan}
    Length Should Be    ${exams}    2

*** Keywords ***
Prepare Two Papers
    Add Exam Paper    ep1  ${test_stuff}[id]
    Add Exam Paper    ep2  ${test_stuff}[id]
    ${aep}  Get Exam Paper  ${test_stuff}[id]
    ${focus_id}  Set Variable  ${aep}[0][id]
    Add Question  q1  a1,a2,a3,a4  ${0}
    Add Question  q2  a5,a6,a7,a8  ${0}
    ${aq}  Get Question
    Add Question to Exam Paper    ${focus_id}    ${aq}[0][id]
    Add Question to Exam Paper    ${focus_id}    ${aq}[1][id]
    ${focus_id}  Set Variable  ${aep}[1][id]
    Add Question to Exam Paper    ${focus_id}    ${aq}[1][id]

Answer Spec Paper
    [Arguments]  ${paper}  ${plan}  ${answer_name}  ${do_fail}=${False}
    ${answers}  Create List
    ${select_answer}  Set Variable  ${0}
    IF  ${do_fail}
        ${select_answer}  Set Variable  ${1}
    END
    FOR    ${element}    IN    @{paper}[questions]
        ${tmp}  Create Dictionary  answer_id=${element}[option_answers][${select_answer}][id]
        Append To List    ${answers}  ${tmp}
    END
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  answers=@{answers}  paper_id=${paper}[id]  open_id=${driver}[open_id]  plan_id=${plan}[id]  name=${answer_name}
    Req to Server    /global/commit_answers    AAAA    ${req}  ${do_fail}

Get Exam By Plan
    [Arguments]  ${plan}
    ${driver}  Driver Online  ${plan}[driver][phone]  open_id_for_test  11100090909
    ${req}  Create Dictionary  open_id=${driver}[open_id]  plan_id=${plan}[id]
    ${resp}  Req to Server    /global/driver_get_exam    AAAA    ${req}
    ${driver_exam}  Set Variable  ${resp}[exams]
    ${req}  Create Dictionary  plan_id=${plan}[id]
    ${resp}  Req to Server    /exam/get_exam_by_plan  ${sc_admin_token}  ${req}
    ${user_exam}  Set Variable  ${resp}[exams]
    Should Be Equal As Strings    ${user_exam}    ${driver_exam}
    RETURN  ${user_exam}


