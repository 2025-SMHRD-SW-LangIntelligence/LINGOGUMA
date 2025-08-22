from fastapi import FastAPI
from pydantic import BaseModel
from evaluation.evaluate import AnswerEvaluator  # evaluate.py 위치 기준

app = FastAPI(title="Answer Evaluator API")

# Evaluator 인스턴스 생성
evaluator = AnswerEvaluator()

# 요청 모델 정의
class SubjectiveRequest(BaseModel):
    answers: list[str]

class ShortAnswerRequest(BaseModel):
    answers: dict  # {"언제": "답", "어떻게": "답", "왜": "답"}

# 서술형 평가 API
@app.post("/evaluate/subjective")
def evaluate_subjective(request: SubjectiveRequest):
    """
    student_answers: list of strings
    반환: [{answer, score, grade}, ...]
    """
    return evaluator.evaluate_subjective(request.answers)

# 단답형 평가 API
@app.post("/evaluate/short")
def evaluate_short(request: ShortAnswerRequest):
    """
    student_answers: dict {"언제": 답, "어떻게": 답, "왜": 답}
    반환: dict {질문: 'O' 또는 'X'}
    """
    return evaluator.evaluate_short_answer(request.answers)

# 간단 실행용
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
