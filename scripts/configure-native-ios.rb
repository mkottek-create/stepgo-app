#!/usr/bin/env ruby
# Konfiguriert den frisch generierten Capacitor-iOS-Container automatisch.
# Wird in GitHub Actions auf dem Mac ausgefuehrt; kein eigener Mac noetig.
require 'fileutils'
require 'xcodeproj'
require 'rexml/document'

root = File.expand_path('..', __dir__)
app = File.join(root, 'ios', 'App', 'App')
project_path = File.join(root, 'ios', 'App', 'App.xcodeproj')
raise 'Capacitor iOS project missing; run npm run ios:init first' unless File.directory?(project_path)

%w[StepGoHealthPlugin.swift StepGoBridgeViewController.swift].each do |filename|
  FileUtils.cp(File.join(root, 'native-ios', filename), File.join(app, filename))
end

project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'App' }
raise 'iOS App target not found' unless target
app_group = project.main_group.find_subpath('App', true)
%w[StepGoHealthPlugin.swift StepGoBridgeViewController.swift].each do |filename|
  ref = app_group.files.find { |r| r.path == filename } || app_group.new_file(filename)
  target.source_build_phase.add_file_reference(ref, true) unless target.source_build_phase.files_references.include?(ref)
end

entitlements = File.join(app, 'StepGoCity.entitlements')
File.write(entitlements, <<~PLIST)
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0"><dict>
    <key>com.apple.developer.healthkit</key><true/>
  </dict></plist>
PLIST
target.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/StepGoCity.entitlements'
end

storyboard = File.join(app, 'Base.lproj', 'Main.storyboard')
raise 'Main.storyboard not found' unless File.file?(storyboard)
xml = REXML::Document.new(File.read(storyboard))
found = false
REXML::XPath.each(xml, '//*[@customClass="CAPBridgeViewController"]') do |element|
  element.attributes['customClass'] = 'StepGoBridgeViewController'
  element.attributes['customModule'] = 'App'
  element.attributes['customModuleProvider'] = 'target'
  found = true
end
raise 'CAPBridgeViewController not found in storyboard' unless found
File.open(storyboard,'w') { |f| REXML::Formatters::Pretty.new(2).write(xml, f) }

info_path = File.join(app, 'Info.plist')
raise 'Info.plist not found' unless File.file?(info_path)
info = REXML::Document.new(File.read(info_path))
info_dict = REXML::XPath.first(info, '/plist/dict')
raise 'Info.plist does not contain dict' unless info_dict
# Eine installierbare iOS-App muss ihren Bundle Identifier in Info.plist tragen.
# Fuer den Simulator-Build ersetzt Xcode den Build-Wert durch die echte App-ID.
if !info_dict.get_elements('key').any? { |e| e.text == 'CFBundleIdentifier' }
  key = info_dict.add_element('key')
  key.text = 'CFBundleIdentifier'
  value = info_dict.add_element('string')
  value.text = '$(PRODUCT_BUNDLE_IDENTIFIER)'
end
if !info_dict.get_elements('key').any? { |e| e.text == 'NSHealthShareUsageDescription' }
  key = info_dict.add_element('key')
  key.text = 'NSHealthShareUsageDescription'
  desc = info_dict.add_element('string')
  desc.text = 'StepGo City liest deine heutigen Schritte fuer deinen Fortschritt, virtuelle Coins und Baupunkte.'
end
File.open(info_path,'w') { |f| REXML::Formatters::Pretty.new(2).write(info, f) }

project.save
puts 'HealthKit-Plugin eingebunden, Berechtigung gesetzt und Storyboard angepasst.'
