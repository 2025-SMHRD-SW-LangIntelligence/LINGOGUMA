from sentence_transformers import SentenceTransformer, util

class AnswerEvaluator:
    def __init__(self):
        """
        초기화: SBERT 모델 로드 및 정답/학생 답안 초기화
        """
        self.model = SentenceTransformer("snunlp/KR-SBERT-V40K-klueNLI-augSTS")

        # 서술형 정답 예시
        self.correct_answers = [
            "범인은 박수진이다. 도서관은 6시에 닫는데 그녀는 7시에 도서관에 있었다고 말했다.",
            "사건 시간과 도서관 운영 시간이 맞지 않으므로 박수진의 알리바이는 거짓이다.",
            "도서관이 이미 문을 닫은 후에 있었다는 증언은 신빙성이 없으므로 박수진이 범인이다."
        ]
        self.correct_embs = self.model.encode(self.correct_answers, convert_to_tensor=True)

        # 단답형 정답 키
        self.short_answer_key = {
            "언제": "어젯밤",
            "어떻게": "창문을 통해 몰래 들어가서",
            "왜": "연구 성과를 가로채려고"
        }

    def get_grade(self, score):
        """
        점수 기반 등급 반환
        """
        if score >= 94:
            return "S+"
        elif score >= 88:
            return "S"
        elif score >= 82:
            return "A+"
        elif score >= 76:
            return "A"
        elif score >= 70:
            return "B+"
        elif score >= 64:
            return "B"
        else:
            return "C 이하"

    def evaluate_subjective(self, student_answers):
        """
        서술형 답안 평가
        student_answers: 리스트
        반환: [{answer, score, grade}, ...]
        """
        results = []
        for ans in student_answers:
            student_emb = self.model.encode(ans, convert_to_tensor=True)
            cos_sim = util.cos_sim(student_emb, self.correct_embs)
            max_sim = cos_sim.max().item()
            score = round(max_sim * 100, 2)
            grade = self.get_grade(score)
            results.append({
                "answer": ans,
                "score": score,
                "grade": grade
            })
        return results

    def evaluate_short_answer(self, user_input):
        """
        단답형 답안 O/X 판별
        user_input: dict {"언제": 답, "어떻게": 답, "왜": 답}
        반환: dict {질문: 'O' 또는 'X'}
        """
        results = {}
        for key in self.short_answer_key:
            results[key] = "O" if user_input.get(key, "").strip() == self.short_answer_key[key] else "X"
        return results

# 예시 실행
if __name__ == "__main__":
    evaluator = AnswerEvaluator()

    # 서술형 평가 예시
    student_ans = [
        "박수진이 범인이다. 도서관은 6시에 닫았는데 그녀는 7시에 있었다.",
        "도서관 운영 시간과 사건 시간이 맞지 않아 박수진의 알리바이는 거짓이다."
    ]
    subj_results = evaluator.evaluate_subjective(student_ans)
    for r in subj_results:
        print(r)

    # 단답형 평가 예시
    short_input = {
        "언제": "어젯밤",
        "어떻게": "창문을 통해 몰래 들어가서",
        "왜": "돈을 훔치려고"
    }
    short_results = evaluator.evaluate_short_answer(short_input)
    print(short_results)