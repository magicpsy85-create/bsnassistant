import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 규정 파일 읽기
function loadRules(): string {
  const rulePath = path.join(__dirname, '..', 'docs', 'rule', '내부규정.md');
  try {
    return fs.readFileSync(rulePath, 'utf-8');
  } catch (e) {
    console.error('규정 파일 로드 실패:', e);
    return '';
  }
}

const SYSTEM_PROMPT = `당신은 BSN빌사남부동산중개법인의 내부규정 안내 챗봇입니다.

## 역할
- 파트너중개사와 도급중개사가 내부규정에 대해 질문하면, 아래 규정을 근거로 정확하게 답변합니다.
- 규정에 명시되지 않은 내용에 대해서는 "해당 내용은 현재 규정에 명시되어 있지 않습니다."라고 안내합니다.

## 용어 정리
- 파트너중개사: 개별 사업체이면서 중개법인 브랜드를 공유하는 공인중개사
- 도급중개사: 파트너중개사의 보조 역할을 하는 공인중개사
- CMS: 중개법인이 개발한 매물/고객 운영관리 시스템
- 진행가능: 현 시점 당장 매매가 가능한 매물 상태
- 진행불가: 현 시점 당장 매매가 불가한 매물 상태

## 답변 방식
- 한국어로 답변합니다.
- 간결하고 명확하게 답변합니다.
- 구체적인 상황이 제시되면 해당 규정을 적용하여 판단 결과를 알려줍니다.
- 복합적인 상황의 경우 관련 규정을 모두 언급합니다.
- 규정의 섹션명, 조항 번호, 항목 번호 등 문서 내 위치 정보는 언급하지 않습니다. 내용만 자연스럽게 설명합니다.
- 규정에 없거나 답변이 불가능한 경우 반드시 '그에 대한 규정은 없습니다.' 또는 '해당 내용은 현재 규정에 명시되어 있지 않습니다.' 문구를 포함하여 답변하세요.

## 문체 규칙 (필수)
- 마크다운 문법(**, *, #, - 등) 사용 금지. 순수 텍스트로만 작성.
- AI가 자동 생성한 티가 나는 정형화된 패턴을 피해라. 같은 접속어가 반복되거나, 불필요하게 격식체로 포장하거나, 내용 없이 있어 보이는 표현이 문제다. 어떤 단어든 문맥에 맞으면 사용 가능하되, 실제 사람이 말하듯이 자연스럽게 써라.
- 동료 직원에게 구두로 설명하듯이 자연스럽게 작성. 강의하는 톤이 아닌 대화하는 톤.

## 내부규정 원문
`;

export async function handleChatbotMessage(userMessage: string): Promise<string> {
  const rules = loadRules();

  if (!rules) {
    return '규정 파일을 불러올 수 없습니다. 관리자에게 문의해 주세요.';
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + rules },
        { role: 'user', content: userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return (content || '답변을 생성할 수 없습니다.').replace(/\*+/g, '');
  } catch (error: any) {
    console.error('OpenAI API 오류:', error);
    if (error.status === 401) {
      return 'API 키가 설정되지 않았거나 유효하지 않습니다. 환경변수 OPENAI_API_KEY를 확인해 주세요.';
    }
    return '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }
}
