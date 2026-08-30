#!/usr/bin/env ruby
# Adiciona o target da Widget Extension ao projeto Xcode gerado pelo Capacitor
# (o Capacitor so cria o target principal "App"; este script injeta o segundo
# target "FinanceFlowWidgetExtension" via a gem xcodeproj, ja que o ios/ e
# regerado do zero em toda build do Codemagic).

require 'xcodeproj'
require 'fileutils'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

main_target = project.targets.find { |t| t.name == 'App' }
raise "Target principal 'App' nao encontrado" unless main_target

widget_target_name = 'FinanceFlowWidgetExtension'
widget_bundle_id = 'com.miguelrios.financeflow.widget'

if project.targets.find { |t| t.name == widget_target_name }
  puts "Target #{widget_target_name} ja existe, pulando criacao."
else
  src_dir = File.join(Dir.pwd, 'ios-extra', 'FinanceFlowWidgetExtension')
  dst_dir = File.join(Dir.pwd, 'ios', 'App', widget_target_name)
  FileUtils.mkdir_p(dst_dir)
  FileUtils.cp(File.join(src_dir, 'FinanceFlowWidget.swift'), File.join(dst_dir, 'FinanceFlowWidget.swift'))
  FileUtils.cp(File.join(src_dir, 'Info.plist'), File.join(dst_dir, 'Info.plist'))

  widget_target = project.new_target(:app_extension, widget_target_name, :ios, '16.0')

  widget_target.build_configurations.each do |config|
    config.build_settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = widget_bundle_id
    config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
    config.build_settings['INFOPLIST_FILE'] = "#{widget_target_name}/Info.plist"
    config.build_settings['SWIFT_VERSION'] = '5.0'
    config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
    config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
    config.build_settings['MARKETING_VERSION'] = '1.0'
    config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
    config.build_settings['SKIP_INSTALL'] = 'YES'
    config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  end

  group = project.main_group.new_group(widget_target_name, widget_target_name)
  swift_ref = group.new_reference('FinanceFlowWidget.swift')
  widget_target.add_file_references([swift_ref])

  ['WidgetKit.framework', 'SwiftUI.framework'].each do |fw|
    fw_ref = project.frameworks_group.new_file("System/Library/Frameworks/#{fw}", :sdk_root)
    widget_target.frameworks_build_phase.add_file_reference(fw_ref)
  end

  embed_phase = main_target.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' || p.symbol_dst_subfolder_spec == :plug_ins }
  unless embed_phase
    embed_phase = main_target.new_copy_files_build_phase('Embed Foundation Extensions')
    embed_phase.symbol_dst_subfolder_spec = :plug_ins
  end
  embed_build_file = embed_phase.add_file_reference(widget_target.product_reference)
  embed_build_file.settings = { 'ATTRIBUTES' => ['RemoveHeaderOnCopy'] }

  main_target.add_dependency(widget_target)

  project.save
  puts "Target #{widget_target_name} criado e incorporado com sucesso."
end

