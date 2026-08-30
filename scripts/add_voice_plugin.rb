#!/usr/bin/env ruby
# Adiciona o plugin nativo VoiceCapture (Swift) ao target principal "App".
# Substitui a dependencia do plugin de terceiros @capacitor-community/speech-recognition
# no iOS, que se mostrou instavel (travava sem capturar audio ou derrubava o app).
# Como o ios/ e regerado do zero em toda build, este script copia os arquivos de
# ios-extra/VoiceCapture para dentro do projeto Xcode e os registra no target "App"
# via a gem xcodeproj. Inclui verificacao explicita para falhar cedo (nesta etapa
# rapida, em vez de so descobrir depois de todo o build) caso algum arquivo nao
# seja corretamente adicionado ao Sources build phase.

require 'xcodeproj'
require 'fileutils'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

main_target = project.targets.find { |t| t.name == 'App' }
raise "Target principal 'App' nao encontrado" unless main_target

feature_name = 'VoiceCapture'
src_dir = File.join(Dir.pwd, 'ios-extra', feature_name)
dst_dir = File.join(Dir.pwd, 'ios', 'App', 'App', feature_name)
FileUtils.mkdir_p(dst_dir)

group = project.main_group.new_group(feature_name, dst_dir)

file_types = {
  'VoiceCapturePlugin.swift' => 'sourcecode.swift',
  'VoiceCapturePlugin.m' => 'sourcecode.c.objc'
}

file_types.each do |filename, file_type|
  FileUtils.cp(File.join(src_dir, filename), File.join(dst_dir, filename))
  ref = group.new_reference(filename)
  ref.last_known_file_type = file_type
  main_target.source_build_phase.add_file_reference(ref)
end

project.save

# Reabre o projeto salvo e confere que os dois arquivos realmente estao no
# Sources build phase do target App. Se algo falhar aqui, o build para nesta
# etapa (rapida) em vez de so quebrar silenciosamente la na frente.
reopened = Xcodeproj::Project.open(project_path)
reopened_target = reopened.targets.find { |t| t.name == 'App' }
sources = reopened_target.source_build_phase.files.map { |f| f.file_ref && f.file_ref.real_path.to_s }.compact
puts "Arquivos VoiceCapture no Sources build phase:"
puts sources.select { |p| p.include?(feature_name) }

file_types.keys.each do |filename|
  found = sources.any? { |p| p.end_with?(filename) }
  raise "ERRO: #{filename} NAO foi adicionado ao Sources build phase do target App!" unless found
end

puts "VoiceCapturePlugin adicionado e verificado com sucesso no target App."
