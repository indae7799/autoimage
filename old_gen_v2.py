"""
肄섑뀗痢??앹꽦 ?쒕퉬??AI瑜??ъ슜?섏뿬 ?ㅻ뜑, ?꾪궧臾멸뎄, ?깅텇, ?ㅻ챸, ?ъ슜踰??앹꽦
"""
import os
import json
import re
from typing import Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class ContentGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY媛 ?ㅼ젙?섏? ?딆븯?듬땲??)
        genai.configure(api_key=api_key, transport="rest")
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def generate_content(self, product_info: Dict[str, Any], search_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        ?쒗뭹 ?뺣낫瑜?諛뷀깢?쇰줈 ?곸꽭?섏씠吏 肄섑뀗痢??앹꽦
        
        Args:
            product_info: ?쒗뭹 ?뺣낫
            search_info: 援ш? 寃??寃곌낵 (?좏깮)
        
        Returns:
            ?앹꽦??肄섑뀗痢?        """
        prompt = self._build_prompt(product_info, search_info)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.8,
                )
            )
            content = self._parse_response(response.text)
            return content
        except Exception as e:
            print(f"肄섑뀗痢??앹꽦 ?ㅽ뙣: {e}")
            import traceback
            traceback.print_exc()
            return self._get_default_content()
    
    def _build_prompt(self, product_info: Dict[str, Any], search_info: Dict[str, Any] = None) -> str:
        """?꾨＼?꾪듃 ?앹꽦"""
        prompt = f"""
?뱀떊? ?쒓뎅 酉고떚/肄붿뒪硫뷀떛 ?댁빱癒몄뒪 ?곸꽭?섏씠吏 ?꾨Ц 理쒓퀬 移댄뵾?쇱씠?곗엯?덈떎.
**20? ?ъ꽦 ?寃잛쑝濡? ?몄뒪?洹몃옩?대굹 ?щ━釉뚯쁺?먯꽌 蹂?踰뺥븳 ?몃젋?뷀븯怨??먯뿰?ㅻ윭????*?쇰줈 ?묒꽦?댁＜?몄슂.
怨쇳븯吏 ?딆? 媛먯꽦?곸씠怨??숉븳 臾몄껜瑜??ъ슜?섏꽭?? "~?댁슂", "~嫄곕뱺??, "?쇰?寃??꾩쟾 誘몄낀二? 媛숈? 援ъ뼱泥대? 留ㅼ슦 ?먯뿰?ㅻ읇寃??욎뼱二쇱꽭?? ?깅뵳???ㅻ챸臾몄? ?덈? 湲덉??⑸땲??
**媛??以묒슂: ?대뼚???띿뒪?몄뿉???대え吏(emoji)瑜??덈? ?ъ슜?섏? 留덉꽭?? ?띿뒪???덉뿉 ?대え吏媛 ?ы븿?섎㈃ ?붿옄?몄씠 臾대꼫吏묐땲??**

?쒗뭹 ?뺣낫:
- 釉뚮옖?? {product_info.get('brandName', 'Unknown')}
- ?쒗뭹紐? {product_info.get('productName', 'Product')}
- 移댄뀒怨좊━: {product_info.get('category', 'General')}
- ?뱀쭠: {', '.join(product_info.get('features', []))}
- ?寃?怨좉컼: 20? ?ъ꽦
- ?ㅼ븻留ㅻ꼫: 移쒓렐?섍퀬 ?먯뿰?ㅻ윭?? ?몃젋?뷀븳 酉고떚 媛먯꽦, ?붿쭅?섍퀬 ?꾪궧(Hooking)?섎뒗 臾멸뎄
"""
        
        if search_info:
            prompt += f"""
異붽? ?뺣낫:
- ?ㅻ챸: {search_info.get('description', '')}
"""
        
        prompt += """
?ㅼ쓬 ?뺤떇??JSON?쇰줈 ?묐떟?댁＜?몄슂. 

**?됱긽 洹쒖튃 (留ㅼ슦 以묒슂)**:
1. "sectionBg" (?뱀뀡 諛곌꼍??瑜?癒쇱? 寃곗젙?섏꽭?? ?쒗뭹 ?대?吏 ?됱긽?붾젅?몄? ?댁슱由щ뒗 ?ㅼ쑝濡?
2. "color" (?띿뒪???됱긽)??諛섎뱶??sectionBg? ?鍮꾧? 紐낇솗?섍쾶 蹂댁씠???됱쑝濡??ㅼ젙?섏꽭??
   - 諛앹? 諛곌꼍 ???대몢???띿뒪??(#1a1a2e, #2d3436 ??
   - ?대몢??諛곌꼍 ??諛앹? ?띿뒪??(#ffffff, #f8f9fa ??
3. ?쒕ぉ(mainTitle)怨?遺?쒕ぉ(subTitle)?먮뒗 諛섎뱶??"textShadow" ?ㅽ??쇱쓣 ?ы븿?섏꽭?? 
   ?? "textShadow": "0 2px 10px rgba(0,0,0,0.2)" (?낆껜媛?遺??

?ъ슜 媛?ν븳 ?쒖껜(fontFamily):
- "Pretendard" (湲곕낯, 紐⑤뜕)
- "Nanum Myeongjo" (?곗븘?? ?꾨━誘몄뾼)
- "Black Han Sans" (媛뺣젹?? ??댄?)
- "Nanum Gothic" (源붾걫?? 媛?낆꽦)

**以묒슂: 以꾨컮轅?洹쒖튃**
- mainTitle, hookText, 媛??ъ씤??content ???띿뒪?멸? 湲몄뼱吏硫?諛섎뱶??\\n (以꾨컮轅??쇰줈 2以?援ъ꽦?섏꽭??
- ?덉떆: "?⑥닚???대젋吏뺤? ?댁젣 洹몃쭔!\\n'吏꾩쭨' ?ㅽ궓耳?댁쓽 ?쒖옉!"

**以묒슂: ??댄룷洹몃옒??洹쒖튃**
- eyebrow: ?쒓? 怨좊뵓 (Pretendard), fontSize 18, fontWeight 400
- mainBrandName: ?곷Ц 紐낆“ (Playfair Display), fontSize 64, fontWeight 900 (紐낆“泥대뒗 蹂쇰뱶 ?덉슜) 
- subProductName: ?곷Ц 怨좊뵓 (Inter), fontSize 36, fontWeight 400
- hookText: fontWeight 500, fontSize 22
- 媛??ъ씤??title: fontWeight 500, fontSize 20
- 媛??ъ씤??content: fontWeight 400, fontSize 15
- ?깅텇/鍮꾧탳 ?뱀뀡 title: fontWeight 500, fontSize 28

?묐떟 JSON ?뺤떇:
{
    "header": {
        "eyebrow": "?쒗뭹?뚭뎄???쒖쨪 ?붿빟 (?쒓?, ?? ?섎（???쒖옉, 源⑤걮???먯떊媛?)",
        "eyebrowStyle": { "fontFamily": "Pretendard", "fontSize": 20, "fontWeight": 400, "color": "#888", "letterSpacing": 2 },
        "mainBrandName": "ENGLISH ONLY. ?쒗뭹???곸쭠?섎뒗 ?곷Ц ?대쫫. ?덉뼱濡??뱀뀡??硫붿씤 ??댄????⑸땲?? 4?⑥뼱 ?댁긽?대㈃ ?먯뿰?ㅻ읇寃?\\n?쇰줈 2以?援ъ꽦. ?쒓? ?덈? 湲덉?. ?? 'GLOWING VITAL\\nSERUM ESSENCE'",
        "mainBrandNameStyle": { "fontFamily": "'Playfair Display', serif", "fontSize": 96, "fontWeight": 900, "color": "#1a2e22", "letterSpacing": 0, "textShadow": "0 2px 15px rgba(0,0,0,0.1)" },
        "subProductName": "?쒓?留? ???곷Ц(mainBrandName)??吏곴??곸씠怨?留ㅻ젰?곸씤 ?쒓? 踰덉뿭. 硫붿씤 ??댄? 諛붾줈 ?꾨옒???ㅼ뼱媛묐땲?? ?곷Ц ?덈? 湲덉?. ?? '湲濡쒖엵 諛붿씠??\n?몃읆 ?먯꽱??",
        "subProductNameStyle": { "fontFamily": "Pretendard", "fontSize": 36, "fontWeight": 400, "color": "#1a2e22", "letterSpacing": 2, "textShadow": "0 1px 10px rgba(0,0,0,0.1)" },
        "hookText": "20? ?ъ꽦??怨듦컧?????뚯뼱?대뒗 ?꾪궧 臾멸뎄 2以? (\\n ?ъ슜, ?щ━釉뚯쁺/?몄뒪? 媛먯꽦, '?닿굅 ?섎굹硫???' 媛숈? ?먮굦?쇰줈)",
        "hookTextStyle": { "fontFamily": "Pretendard", "fontSize": 20, "fontWeight": 500, "color": "#666" },
        "sectionBg": "#fdf2f0",
        "image_prompt": "Exact MJ/DALL-E prompt: Product hero shot with soft pink or neutral background, decorative botanical line illustrations overlaid on edges (peony, magnolia, tulip sketches), product centered with subtle shadows, premium Korean cosmetic styling, editorial lighting. Include the product brand name and visual identity. --ar 3:4 --style raw"
    },
    "points": [
        {
            "title": "?듭떖 ?ъ씤??1 ?쒕ぉ (酉고떚 媛먯꽦?쇰줈)",
            "content": "?곸꽭 ?ㅻ챸 (20? ?ъ꽦 ?? 2-3臾몄옣. '?ㅻŉ?ㅺ굅?좎슂', '蹂댁씠?쒕굹??' 媛숈? 援ъ뼱泥??욊린)",
            "image_prompt": "Photorealistic: Two elegant female hands gently holding/presenting the [?쒗뭹 ?대쫫] product box/container against a soft gradient background. Hands should be clean and well-manicured. Soft studio lighting with subtle sparkle/bubble effects around the product. Focus on premium unboxing moment. Korean beauty style photography. --ar 16:9 --style raw"
        },
        {
            "title": "?듭떖 ?ъ씤??2 ?쒕ぉ",
            "content": "?곸꽭 ?ㅻ챸",
            "image_prompt": "Product photography of cosmetics, hyper-realistic, 8k resolution, soft studio lighting, water splash background, macro lens, showing the actual texture on skin, soft natural bathroom or vanity lighting, close-up angle, premium cosmetic editorial style. --ar 16:9 --style raw"
        },
        {
            "title": "?듭떖 ?ъ씤??3 ?쒕ぉ",
            "content": "?곸꽭 ?ㅻ챸",
            "image_prompt": "Product packaging detail: The [?쒗뭹 ?대쫫] with lid/cap removed, showing the contents inside. Dramatic close-up perspective from slightly above. Premium studio lighting emphasizing color and texture of the product formula. Scattered ingredients or botanicals around the product. --ar 16:9 --style raw"
        }
    ],
    "points_title": "?ъ씤???뱀뀡 ?쒕ぉ",
    "points_image_prompt": "Overall lifestyle shot: [?쒗뭹 ?대쫫] placed in an elegant bathroom/vanity setting with towels, candles, plants. Soft morning light through window. Lifestyle editorial photography. --ar 4:3 --style raw",
    "ingredients": {
        "title": "?듭떖 ?깅텇 ?뱀뀡 ?쒕ぉ",
        "description": "?깅텇 ?뱀뀡 ?ㅻ챸 ?쒖쨪",
        "items": [
            {
                "name": "?깅텇紐?1 (?? Glutathione, Hyaluronic Acid ???ㅼ젣 ?깅텇)",
                "description": "?깅텇 ?ㅻ챸 (2?媛 ?댄빐?섍린 ?쎄쾶)",
                "image_prompt": "Macro photograph of [?깅텇 1 ?먮Ъ] - e.g. water droplet on skin for hyaluronic acid, orange slices with powder for vitamin C, gold liquid serum for glutathione. Clean circular crop composition. Soft gradient background. Scientific yet beautiful. --ar 1:1"
            },
            {
                "name": "?깅텇紐?2",
                "description": "?깅텇 ?ㅻ챸",
                "image_prompt": "Macro photograph of [?깅텇 2 ?먮Ъ] - different ingredient visual. High-contrast studio photography showing the raw ingredient in its most visually appealing form. Clean circular crop. Scientific cosmetic feel. --ar 1:1"
            },
            {
                "name": "?깅텇紐?3",
                "description": "?깅텇 ?ㅻ챸",
                "image_prompt": "Macro photograph of [?깅텇 3 ?먮Ъ]. Vibrant colors. Can show molecular structure diagram subtly overlaid. Clean minimal background. Korean cosmetic ingredient photography style. --ar 1:1"
            }
        ],
        "style": { "backgroundColor": "#F5F9F6", "color": "#2d3436" },
        "image_prompt": "Flat lay of all key ingredients arranged beautifully around the product. Top-down studio photography with soft even lighting. Clean white or light marble surface. Korean beauty editorial style."
    },
    "comparison": {
        "title": "鍮꾧탳 ?뱀뀡 ?쒕ぉ (?ъ슜 ?????먮굦)",
        "before": "?ъ슜 ???곹깭 臾섏궗 (1臾몄옣)",
        "after": "?ъ슜 ??蹂??臾섏궗 (1臾몄옣)",
        "percentage": "媛쒖꽑??(?? 221%)",
        "style": { "backgroundColor": "#FAFBFF", "color": "#1a1a2e" },
        "before_image_prompt": "Close-up skin texture showing dull, rough, or problematic skin condition. Slightly desaturated color palette. Medical/clinical photography style with even lighting. The skin should show visible concerns (enlarged pores, uneven tone, dryness). --ar 1:1 --style raw",
        "after_image_prompt": "Close-up glowing, smooth, healthy skin after using the product. Bright, radiant, even-toned complexion. Dewy fresh look with soft natural light highlighting the skin glow. Same angle as before image. --ar 1:1 --style raw"
    },
    "review": {
        "title": "?대윴 遺꾨뱾猿?異붿쿇?⑸땲??,
        "items": [
            { "title": "由щ럭 ?쒕ぉ 1 (?쒖쨪 ?붿빟)", "content": "由щ럭 ?곸꽭 (?ㅼ궗???꾧린 ?? 2-3臾몄옣)" },
            { "title": "由щ럭 ?쒕ぉ 2", "content": "由щ럭 ?곸꽭" },
            { "title": "由щ럭 ?쒕ぉ 3", "content": "由щ럭 ?곸꽭" }
        ],
        "style": { "backgroundColor": "#FFFFFF", "color": "#2d3436" },
        "image_prompt": "Lifestyle scene: Young Korean woman in her 20s holding the [?쒗뭹 ?대쫫] product with a satisfied expression. Soft natural lighting in a modern Korean apartment. Casual, relatable, Instagram-worthy mood. Should feel authentic, not overly posed. --ar 3:4 --style raw"
    },
    "texture": {
        "title": "?띿뒪泥??뱀뀡 ?쒕ぉ",
        "content": "?쒗삎/?띿뒪泥?臾섏궗 (媛먭컖?곸쑝濡? 2臾몄옣)",
        "style": { "backgroundColor": "#1a1a2e", "color": "#ffffff" },
        "image_prompt": "Extreme macro photography of the product texture/formula. Show the cream, gel, foam, or liquid texture in ultra close-up detail. Bubbles, droplets, or swirl patterns visible. Dramatic lighting creating depth and dimension. Dark moody background to make the texture pop. Cosmetic texture photography. --ar 3:4 --style raw"
    },
    "description": {
        "title": "?쒗뭹 ?ㅻ챸 ?뱀뀡 ?쒕ぉ",
        "content": "?쒗뭹 ?곸꽭 ?ㅻ챸 (移쒓렐???? 援ъ뼱泥??욎뼱??",
        "style": { "backgroundColor": "#FFFFFF", "color": "#1a1a2e" },
        "image_prompt": "Elegant product still life: The [?쒗뭹 ?대쫫] on a marble or textured surface with scattered flower petals, green leaves, and natural elements. Soft diffused natural light from the side. Premium editorial beauty photography. --ar 3:4 --style raw"
    },
    "brand": {
        "title": "釉뚮옖??泥좏븰",
        "content": "釉뚮옖?쒖쓽 媛移섏? 泥좏븰???댁? 2-3臾몄옣",
        "style": { "backgroundColor": "#FAFAFA", "color": "#2d3436" },
        "image_prompt": "Lifestyle brand image representing the core philosophy. Clean, elegant, trustworthy mood. --ar 16:9 --style raw"
    },
    "usage": {
        "title": "?ъ슜踰??뱀뀡 ?쒕ぉ",
        "steps": [
            "1?④퀎 (吏㏐퀬 紐낇솗?섍쾶, ?대え吏 ?덈? 湲덉?)",
            "2?④퀎",
            "3?④퀎"
        ],
        "style": { "backgroundColor": "#F0F4FF", "color": "#2d3436" },
        "image_prompt": "Professional studio photography of step-by-step product application, clean minimal background, soft lighting, focus on hands and product texture, high-end cosmetic instructional style. --ar 16:9 --style raw"
    },
    "product_info": {
        "full_ingredients": "?쒗뭹 移댄뀒怨좊━??留욌뒗 ?꾩꽦遺꾩쓣 ?덉륫?섏뿬 ?곸뼱濡??묒꽦 (?? Water, Glycerin, Niacinamide, ...). ?ㅼ젣 ?꾩꽦遺?由ъ뒪?몄쿂??肄ㅻ쭏濡?援щ텇?섏뿬 ?곸꽭?섍쾶.",
        "style": { "backgroundColor": "#F9FAFB", "color": "#475569" }
    }
}

?쒓뎅?대줈留??묐떟?섏꽭?? 20? 媛먯꽦??移쒓렐?섍퀬 ?먯뿰?ㅻ윭??留덉????ㅼ쑝濡??묒꽦?섎릺 怨쇰?愿묎퀬???쇳빐二쇱꽭??
諛곌꼍?됯낵 ?띿뒪?몄깋???鍮꾨? 諛섎뱶???뺤씤?섏꽭?? ?쒕ぉ?먮뒗 諛섎뱶??textShadow瑜??ｌ뼱 ?낆껜媛먯쓣 ?대젮二쇱꽭??
image_prompt??諛섎뱶???곸뼱濡??묒꽦?섏꽭?? Midjourney??DALL-E?먯꽌 諛붾줈 ?ъ슜 媛?ν븳 援ъ껜?곸씠怨??꾨Ц?곸씤 ?꾨＼?꾪듃濡??묒꽦?섏꽭??

[?듭떖 ?깅텇(ingredients) ?묒꽦 ??二쇱쓽?ы빆]
- 諛섎뱶???쒗뭹??*吏꾩쭨 硫붿씤 ?쒖꽦 ?깅텇*留?3~4媛?異붿텧?댁꽌 JSON 諛곗뿴濡?湲곗옱?섏꽭?? 
- 蹂댁“ ?깅텇?대굹 ?뺤젣??媛숈? ?쇰컲?곸씤 ?먮즺???쒖쇅?섏꽭?? 
- JSON ?묐떟 ?덉뿉???덈?濡?// ???대뼚??二쇱꽍???ｌ? 留덉꽭??
"""
        return prompt
    
    def _parse_response(self, text: str) -> Dict[str, Any]:
        """AI ?묐떟 ?뚯떛 - 以묒꺽 以묎큵??異붿쟻 諛⑹떇?쇰줈 寃ш퀬?섍쾶 異붿텧"""
        try:
            # 1李? 吏곸젒 JSON ?뚯떛 ?쒕룄 (response_mime_type???묐룞??寃쎌슦)
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass
            
            # 2李? 以묒꺽 以묎큵??源딆씠瑜?異붿쟻?섏뿬 理쒖쇅怨?JSON 媛앹껜 異붿텧
            start = text.find('{')
            if start == -1:
                raise ValueError("JSON ?쒖옉?먯쓣 李얠쓣 ???놁쓬")
            
            depth = 0
            in_string = False
            escape_next = False
            end = start
            
            for i in range(start, len(text)):
                ch = text[i]
                if escape_next:
                    escape_next = False
                    continue
                if ch == '\\':
                    escape_next = True
                    continue
                if ch == '"':
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            
            content = text[start:end + 1]
            # ?몃젅?쇰쭅 肄ㅻ쭏 ?쒓굅
            content = re.sub(r',\s*([}\]])', r'\1', content)
            # JS ?ㅽ???二쇱꽍 ?쒓굅
            content = re.sub(r'//.*?(?=\n|$)', '', content)
            return json.loads(content)
        except Exception as e:
            print(f"?묐떟 ?뚯떛 ?ㅽ뙣: {e}")
            print(f"?먮낯 ?띿뒪??(??500??: {text[:500]}")
        
        return self._get_default_content()
    
    def _get_default_content(self) -> Dict[str, Any]:
        """湲곕낯 肄섑뀗痢?諛섑솚"""
        return {
            "header": {
                "mainTitle": "?꾨━誘몄뾼 ?쒗뭹",
                "subTitle": "?뱀떊???쇱긽??諛붽씀??,
                "hookText": "吏湲?諛붾줈 寃쏀뿕?대낫?몄슂",
                "image_prompt": "premium product photography, minimal background, studio lighting, 8k resolution"
            },
            "ingredients": {
                "title": "?듭떖 ?깅텇",
                "items": [
                    {
                        "name": "二쇱슂 ?깅텇",
                        "description": "?④낵?곸씤 ?깅텇?쇰줈 ?쒗뭹???덉쭏??蹂댁옣?⑸땲??,
                        "image_prompt": "natural ingredients, fresh water splash, macro photography, soft lighting"
                    }
                ],
                "image_prompt": "natural ingredients, fresh water splash, macro photography, soft lighting"
            },
            "description": {
                "title": "?쒗뭹 ?뚭컻",
                "content": "怨좏뭹吏덉쓽 ?쒗뭹?쇰줈 ?щ윭遺꾩쓽 ?쇱긽???붿슧 ?띿슂濡?쾶 留뚮뱾?대뱶由쎈땲??",
                "image_prompt": "lifestyle photography, elegant atmosphere, soft natural light, product in use"
            },
            "usage": {
                "title": "?ъ슜踰?,
                "steps": [
                    "1?④퀎: ?쒗뭹??以鍮꾪빀?덈떎",
                    "2?④퀎: ?곸젅???ъ슜?⑸땲??,
                    "3?④퀎: ?④낵瑜??뺤씤?⑸땲??
                ],
                "image_prompt": "step by step product usage illustration, clean background, instructional style"
            },
            "brand": {
                "title": "釉뚮옖???뚭컻",
                "content": "?좊ː?????덈뒗 釉뚮옖??泥좏븰??寃쏀뿕?대낫?몄슂.",
                "image_prompt": "brand lifestyle photography, professional, clean"
            },
            "product_info": {
                "full_ingredients": "Water, Glycerin, Propylene Glycol, Alcohol, Fragrance",
                "style": { "backgroundColor": "#F9FAFB", "color": "#475569" }
            }
        }
