<!-- Target BR: BR-xxx -->
<!-- 此檔案定義 change 的需求變更。OpenSpec archive 會解析此格式回寫 BR。 -->
<!-- ⚠️ 格式錯誤會導致 archive 失敗。MUST 使用下方精確的 header 格式。 -->

## ADDED Requirements

<!-- 每個新增需求 MUST 使用以下格式（不可省略 ### 和 ####）： -->

### Requirement: <!-- requirement name (kebab-case or descriptive) -->
<!-- requirement description. Use MUST/SHALL for normative requirements. -->

#### Scenario: <!-- scenario name -->
- **WHEN** <!-- condition -->
- **THEN** <!-- expected outcome -->

## MODIFIED Requirements

<!-- 每個修改需求 MUST 複製原始 requirement block 完整內容，再修改。 -->
<!-- 不可只寫差異，必須包含完整的 Requirement + Scenario。 -->

### Requirement: <!-- existing requirement name (must match original) -->
<!-- FULL updated requirement description -->

#### Scenario: <!-- scenario name -->
- **WHEN** <!-- updated condition -->
- **THEN** <!-- updated expected outcome -->

## REMOVED Requirements

<!-- 每個移除需求 MUST 包含 Reason 和 Migration。 -->

### Requirement: <!-- requirement name to remove -->
**Reason**: <!-- why this is being removed -->
**Migration**: <!-- what replaces it, or "N/A" -->
