#!/usr/bin/env ruby
# Adiciona o plugin nativo VoiceCapture (Swift) ao target principal "App".
# Substitui a dependencia do plugin de terceiros @capacitor-community/speech-recognition
# no iOS, que se mostrou instavel (travava sem capturar audio ou derrubava o app).
# Como o ios/ e regerado do zero em toda build, este script copia os arquivos de
# ios-extra/VoiceCapture para dentro do projeto Xcode e os registra no target "App"
# via a gem xcodeproj.

require 'xcodeproj'
require 'fileutils'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

main_target = project.targets.find { |t| t.name == 'App' }
raise "Target principal 'App' nao encontrado" unless main_target

src_dir = File.join(Dir.pwd, 'ios-extra', 'VoiceCapture')
dst_dir = File.join(Dir.pwd, 'ios', 'App', 'App')

files = ['VoiceCapturePlugin.swift', 'VoiceCapturePlugin.m']
refs = files.map do |filename|
  FileUtils.cp(File.join(src_dir, filename), File.join(dst_dir, filename))
  project.main_group.new_reference(File.join(dst_dir, filename))
end

main_target.add_file_references(refs)

project.save
puts "VoiceCapturePlugin adicionado ao target App com sucesso."
