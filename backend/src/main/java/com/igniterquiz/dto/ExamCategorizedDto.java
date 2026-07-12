package com.igniterquiz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamCategorizedDto {
    private List<ExamDto> upcoming;
    private List<ExamDto> live;
    private List<ExamDto> completed;
}
