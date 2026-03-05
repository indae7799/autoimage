"""
템플릿 관리 서비스
템플릿 로드, 색상 변수 매핑 등을 처리
"""
import json
import os
from typing import Dict, Any, List
from pathlib import Path

class TemplateService:
    def __init__(self, templates_dir: str = "templates"):
        self.templates_dir = Path(templates_dir)
        self.templates_cache = {}
        self._load_templates()
    
    def _load_templates(self):
        """템플릿 파일들을 로드"""
        if not self.templates_dir.exists():
            self.templates_dir.mkdir(parents=True, exist_ok=True)
            return
        
        for template_file in self.templates_dir.glob("*.json"):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    template = json.load(f)
                    self.templates_cache[template['id']] = template
            except Exception as e:
                print(f"템플릿 로드 실패 {template_file}: {e}")
    
    def get_template(self, template_id: str) -> Dict[str, Any]:
        """템플릿 가져오기"""
        return self.templates_cache.get(template_id)
    
    def list_templates(self) -> List[Dict[str, Any]]:
        """모든 템플릿 목록 반환"""
        return [
            {
                "id": t["id"],
                "name": t["name"],
                "description": t.get("description", "")
            }
            for t in self.templates_cache.values()
        ]
    
    def apply_color_mapping(self, template: Dict[str, Any], color_palette: Dict[str, str]) -> Dict[str, Any]:
        """
        이미지에서 추출한 색상 팔레트를 템플릿 색상 변수에 매핑
        
        Args:
            template: 템플릿 데이터
            color_palette: 이미지에서 추출한 색상 (primary, secondary, accent 등)
        
        Returns:
            색상이 적용된 템플릿
        """
        import copy
        template_copy = copy.deepcopy(template)
        
        # 색상 매핑 규칙
        color_mapping = template_copy.get("colorMapping", {})
        color_vars = template_copy.get("colorVariables", {})
        
        # 이미지 색상 → 템플릿 색상 변수 매핑
        if "primaryColor" in color_mapping:
            color_vars["primaryColor"] = color_palette.get("primary", color_vars.get("primaryColor", "#7A9E8A"))
        
        if "accentColor" in color_mapping:
            color_vars["accentColor"] = color_palette.get("accent", color_vars.get("accentColor", "#4E7A62"))
        
        # 제목 색상은 대비가 높은 색상으로 자동 계산
        primary_rgb = self._hex_to_rgb(color_vars["primaryColor"])
        title_color = self._calculate_contrast_color(primary_rgb)
        color_vars["titleColor"] = title_color
        
        # 부제목은 제목보다 약간 밝게
        color_vars["subTitleColor"] = self._adjust_brightness(title_color, 0.2)
        
        # 본문 색상은 중간 톤
        body_color = self._adjust_brightness(title_color, 0.5)
        color_vars["bodyColor"] = body_color
        
        template_copy["colorVariables"] = color_vars
        
        # 템플릿 내 모든 필드의 색상 변수 치환
        self._replace_color_variables(template_copy, color_vars)
        
        return template_copy
    
    def _hex_to_rgb(self, hex_color: str) -> tuple:
        """HEX 색상을 RGB로 변환"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _rgb_to_hex(self, rgb: tuple) -> str:
        """RGB를 HEX로 변환"""
        return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
    
    def _calculate_luminance(self, rgb: tuple) -> float:
        """RGB의 밝기 계산 (WCAG 기준)"""
        r, g, b = [x / 255.0 for x in rgb]
        r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
        g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
        b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    
    def _calculate_contrast_color(self, rgb: tuple) -> str:
        """배경색에 대비되는 텍스트 색상 계산"""
        luminance = self._calculate_luminance(rgb)
        # 밝은 배경이면 어두운 텍스트, 어두운 배경이면 밝은 텍스트
        return "#1a2e22" if luminance > 0.5 else "#FFFFFF"
    
    def _adjust_brightness(self, hex_color: str, factor: float) -> str:
        """색상 밝기 조정"""
        rgb = self._hex_to_rgb(hex_color)
        adjusted = tuple(min(255, max(0, int(x * (1 + factor)))) for x in rgb)
        return self._rgb_to_hex(adjusted)
    
    def _replace_color_variables(self, template: Dict[str, Any], color_vars: Dict[str, str]):
        """템플릿 내 모든 색상 변수 치환"""
        def replace_in_dict(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                        var_name = value[2:-2]
                        if var_name in color_vars:
                            obj[key] = color_vars[var_name]
                    else:
                        replace_in_dict(value)
            elif isinstance(obj, list):
                for item in obj:
                    replace_in_dict(item)
        
        replace_in_dict(template)
