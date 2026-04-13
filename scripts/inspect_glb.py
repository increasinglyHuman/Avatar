"""Inspect GLB files to list all meshes and armatures."""
import bpy
import sys

filepath = sys.argv[sys.argv.index("--") + 1]
label = filepath.split("/")[-1]

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import GLB
bpy.ops.import_scene.gltf(filepath=filepath)

print(f"\n{'='*60}")
print(f"FILE: {label}")
print(f"{'='*60}")

for obj in sorted(bpy.data.objects, key=lambda o: o.type):
    info = f"  [{obj.type}] {obj.name}"
    if obj.type == 'MESH':
        mesh = obj.data
        verts = len(mesh.vertices)
        faces = len(mesh.polygons)
        mats = [m.name for m in mesh.materials if m]
        info += f" — {verts} verts, {faces} faces, mats: {mats}"
    elif obj.type == 'ARMATURE':
        info += f" — {len(obj.data.bones)} bones"
    print(info)

print(f"{'='*60}\n")
