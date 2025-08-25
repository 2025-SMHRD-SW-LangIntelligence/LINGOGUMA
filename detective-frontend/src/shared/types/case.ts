// 타입 정의
export type Scenario = {
  id: string;
  title: string;
  description: string;
  image: string;
};

// mock 데이터
export const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    title: "도서관에서 사라진 고서",
    description:
      "도서관에서 귀중한 고서가 감쪽같이 사라졌다. 용의자는 사서와 연구원, 학생뿐이다.",
    image: "/mock/scenario1.png",
  },
  {
    id: "s2",
    title: "밀실의 마지막 실험",
    description:
      "잠긴 연구실 안에서 수상한 실험 흔적이 발견되었다. 밀실 속 범인을 찾아야 한다.",
    image: "/mock/scenario2.png",
  },
  // ... s3 ~ s10
];
